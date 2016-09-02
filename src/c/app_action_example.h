#include <pebble.h>

typedef enum {
  VERA_UNLOCKED,
  VERA_LOCKED,
  VERA_UNKNOWN
} VeraLockState;

const char * prv_vera_status_message(VeraLockState *state);
static void prv_update_app_glance(AppGlanceReloadSession *session, size_t limit, void *context);
static void prv_vera_toggle_state();
static void prv_inbox_received_handler(DictionaryIterator *iter, void *context);
static void prv_exit_delay();
static void prv_exit_application(void *data);
static void prv_init_app_message();
static void prv_init(void);
static void prv_deinit(void);
static void prv_window_load(Window *window);
static void prv_window_unload(Window *window);
