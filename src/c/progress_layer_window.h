#pragma once

#include <pebble.h>
#include "progress_layer.h"

//#include "../layers/progress_layer.h"
#include "progress_layer.h"

#define PROGRESS_LAYER_WINDOW_DELTA 33
#define PROGRESS_LAYER_WINDOW_WIDTH 80

void progress_layer_window_push();
void progress_layer_window_remove();
void set_step(int step);