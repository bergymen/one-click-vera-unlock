
#include "progress_layer_window.h"
//#include "progress_layer.h"
#define NB_ETAPES 6

static Window *s_window;
static ProgressLayer *s_progress_layer;
TextLayer *statusMessage;

static AppTimer *s_timer;
static int s_progress;
static int max_progress = 0;
static int current_step = 0;
static char *Status[27] = { "Initializing", "Loading\nsaved settings", "Getting\ncontroller URL", "Choosing\nbest URL", "Getting\nCurrent state", "Sending action\nto lock", "Done" };

static void progress_callback(void *context);

static void next_timer() {
  s_timer = app_timer_register(PROGRESS_LAYER_WINDOW_DELTA, progress_callback, NULL);
}

static void progress_callback(void *context) {
  //s_progress += (s_progress < 100) ? 1 : -100;
	//APP_LOG(APP_LOG_LEVEL_DEBUG, "progress: %d Maximum: %d", s_progress, max_progress);
	s_progress += (s_progress < max_progress) ? 1 : 0;
  progress_layer_set_progress(s_progress_layer, s_progress);	
  next_timer();
}

void update_status_string(){
	text_layer_set_text(statusMessage, Status[current_step]);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_progress_layer = progress_layer_create(GRect((bounds.size.w - PROGRESS_LAYER_WINDOW_WIDTH) / 2, (bounds.size.w/4)*3, PROGRESS_LAYER_WINDOW_WIDTH, 6));
  progress_layer_set_progress(s_progress_layer, 0);
  progress_layer_set_corner_radius(s_progress_layer, 2);
  progress_layer_set_foreground_color(s_progress_layer, PBL_IF_COLOR_ELSE(GColorWhite, GColorBlack));
  progress_layer_set_background_color(s_progress_layer, PBL_IF_COLOR_ELSE(GColorBlack, GColorLightGray));
  layer_add_child(window_layer, s_progress_layer);
	
	statusMessage = text_layer_create(GRect(0,25,bounds.size.w, (bounds.size.h/3)*2-31));
	text_layer_set_text_alignment(statusMessage, GTextAlignmentCenter);
	text_layer_set_background_color(statusMessage, GColorFromRGBA(0,0,0,0));
	text_layer_set_text_color(statusMessage, PBL_IF_COLOR_ELSE(GColorWhite, GColorBlack));
	text_layer_set_font(statusMessage, fonts_get_system_font(FONT_KEY_GOTHIC_28));
	update_status_string();
	layer_add_child(window_layer, text_layer_get_layer(statusMessage));
	
	set_step(1);
}

static void window_unload(Window *window) {
  progress_layer_destroy(s_progress_layer);
	text_layer_destroy(statusMessage);
  window_destroy(window);
  s_window = NULL;
}

void set_step(int step){
	current_step = step;
	max_progress = ((current_step * 100) / NB_ETAPES);
	//APP_LOG(APP_LOG_LEVEL_INFO, "max changed Maximum: %x step: %d", ((current_step / NB_ETAPES) * 100), current_step);
	APP_LOG(APP_LOG_LEVEL_INFO, "current step: %d - nb of step: %d - calculs res: %d", current_step, NB_ETAPES, max_progress);
	update_status_string();
}

static void window_appear(Window *window) {
  s_progress = 0;
  next_timer();
}

static void window_disappear(Window *window) {
  if(s_timer) {
    app_timer_cancel(s_timer);
    s_timer = NULL;
  }
}

void progress_layer_window_push() {
  if(!s_window) {
    s_window = window_create();
    window_set_background_color(s_window, PBL_IF_COLOR_ELSE(GColorLightGray, GColorWhite));
    window_set_window_handlers(s_window, (WindowHandlers) {
      .load = window_load,
      .appear = window_appear,
      .disappear = window_disappear,
      .unload = window_unload
    });
  }
  window_stack_push(s_window, true);
}

void progress_layer_window_remove(){
	if(s_window){
		window_stack_remove(s_window, true);
	}
}