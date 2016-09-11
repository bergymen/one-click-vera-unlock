#include <pebble.h>
#include "app_action_example.h"
#include "dialog_config_window.h"
#include "progress_layer_window.h"
#include "error_message_window.h"

static Window *s_window;
static VeraLockState s_vera_state;
static TextLayer *s_txt_layer;

int main(void) {
  prv_init();
  app_event_loop();
  prv_deinit();
}

static void prv_init(void) {
  prv_init_app_message();
	
	s_vera_state = (VeraLockState) 2;
  s_window = window_create();
  window_set_window_handlers(s_window, (WindowHandlers) {
    .load = prv_window_load,
    .unload = prv_window_unload,
  });
  window_stack_push(s_window, false);
}

static void prv_init_app_message() {
  // Initialize AppMessage
  app_message_register_inbox_received(prv_inbox_received_handler);
  app_message_open(256, 256);
}

static void prv_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  //Create a TextLayer to show the result
  s_txt_layer = text_layer_create(GRect(0, (bounds.size.h/2)-30, bounds.size.w, 60));
  text_layer_set_background_color(s_txt_layer, GColorClear);
  text_layer_set_text_color(s_txt_layer, GColorBlack);
  text_layer_set_font(s_txt_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(s_txt_layer, GTextAlignmentCenter);
  text_layer_set_text(s_txt_layer, "Initializing");
  layer_add_child(window_layer, text_layer_get_layer(s_txt_layer));
}

static void prv_inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *ready_tuple = dict_find(iter, MESSAGE_KEY_APP_READY);
  if (ready_tuple) {
    if(launch_reason() == APP_LAUNCH_USER || launch_reason() == APP_LAUNCH_QUICK_LAUNCH) {
      // Toggle the lock!
      prv_vera_toggle_state();
			progress_layer_window_push();
			//remove main window
			/*if(s_window){
				window_stack_remove(s_window, false);
			}*/
    } else {
      // Application was just installed, or configured
      text_layer_set_text(s_txt_layer, "App Installed");
    }
    return;
  }
	
	Tuple *configured_tuple = dict_find(iter, MESSAGE_KEY_CONFIGURED);
	if(configured_tuple){
		//show config page if not configured
		bool configured = (bool)configured_tuple->value->int32;
		if(!configured){
			//show config page
			dialog_config_window_push();
		}
		else{
			dialog_config_window_remove();
			prv_exit_delay();
		}
	}
	
	Tuple *error_tuple = dict_find(iter, MESSAGE_KEY_ERROR);
	if(error_tuple){
		//show error page
		//static char str[50];
		error_message_window_push(error_tuple->value->cstring);
		dialog_config_window_remove();
		progress_layer_window_remove();
		//remove main window
		if(s_window){
			window_stack_remove(s_window, false);
		}
	}

  Tuple *lock_state_tuple = dict_find(iter, MESSAGE_KEY_LOCK_STATE);
  if (lock_state_tuple) {
    // Lockitron state has changed
    s_vera_state = (VeraLockState)lock_state_tuple->value->int32;

    // Display the current lock state
    static char str[50];
    snprintf(str, sizeof(str), "Door is now\n%s", prv_vera_status_message(&s_vera_state));
    text_layer_set_text(s_txt_layer, str);

    // Exit the application, after timeout
    prv_exit_delay();
  }
	
	Tuple *step_tuple = dict_find(iter, MESSAGE_KEY_STEP);
  if (step_tuple) {
    // current step
    int step = (int)step_tuple->value->int32;
		set_step(step);
  }
}

static void prv_exit_delay() {
  // Get the system timeout duration
  int timeout = preferred_result_display_duration();

  // After the timeout, exit the application
  //AppTimer *timer = app_timer_register(timeout, prv_exit_application, NULL);
	app_timer_register(timeout, prv_exit_application, NULL);
}

static void prv_exit_application(void *data) {
  // App can exit to return directly to their default watchface
  exit_reason_set(APP_EXIT_ACTION_PERFORMED_SUCCESSFULLY);

  // Exit the application by unloading the only window
	if(s_window){
  	window_stack_remove(s_window, false);
	}
	//remove loading if present
	progress_layer_window_remove();
}

// Request a state change for the vera (Unlock/Lock)
/*NOT USED*/
static void prv_vera_toggle_state() {
  DictionaryIterator *out;
  AppMessageResult result = app_message_outbox_begin(&out);
  if (result != APP_MSG_OK) {
    text_layer_set_text(s_txt_layer, "Outbox Failed");
  }

	dict_write_int8(out, MESSAGE_KEY_TOGGLE, 1);

  result = app_message_outbox_send();
  if (result != APP_MSG_OK) {
    text_layer_set_text(s_txt_layer, "Message Failed");
  }
}

static void prv_window_unload(Window *window) {
  window_destroy(s_window);
}

static void prv_deinit(void) {
  // Before the application terminates, setup the AppGlance
  app_glance_reload(prv_update_app_glance, &s_vera_state);
}

// Create the AppGlance displayed in the system launcher
static void prv_update_app_glance(AppGlanceReloadSession *session, size_t limit, void *context) {
  // Check we haven't exceeded system limit of AppGlance's
  if (limit < 1) return;

  // Retrieve the current vera state from context
  VeraLockState *vera_state = context;

  // Generate a friendly message for the current vera state
  char str[50];
  snprintf(str, sizeof(str), "%s", prv_vera_status_message(vera_state));
  APP_LOG(APP_LOG_LEVEL_INFO, "STATE: %s", str);

  // Create the AppGlanceSlice (no icon, no expiry)
  AppGlanceSlice entry = (AppGlanceSlice) {
    .layout = {
      .subtitle_template_string = str
    },
    .expiration_time = APP_GLANCE_SLICE_NO_EXPIRATION
  };

  // Add the slice, and check the result
  const AppGlanceResult result = app_glance_add_slice(session, entry);
  if (result != APP_GLANCE_RESULT_SUCCESS) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "AppGlance Error: %d", result);
  }
}

// Generate a string to display the vera state
const char * prv_vera_status_message(VeraLockState *state) {
  switch(*state) {
    case VERA_UNLOCKED:
      return "UNLOCKED";
    case VERA_LOCKED:
      return "LOCKED";
    default:
      return "";//"UNKNOWN";
  }
}
