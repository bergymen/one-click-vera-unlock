#pragma once

#include <pebble.h>

#define DIALOG_MESSAGE_WINDOW_MARGIN   10

void error_message_window_push(char* str);
void error_message_window_remove();
