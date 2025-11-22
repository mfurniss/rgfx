//
//  easing.h
//
//  Copyright (c) 2011, Auerhaus Development, LLC
//
//  This program is free software. It comes without any warranty, to
//  the extent permitted by applicable law. You can redistribute it
//  and/or modify it under the terms of the Do What The Fuck You Want
//  To Public License, Version 2, as published by Sam Hocevar. See
//  http://sam.zoy.org/wtfpl/COPYING for more details.
//

#ifndef EASING_H
#define EASING_H

#ifdef __cplusplus
extern "C" {
#endif

// Float precision easing functions
float linearInterpolationf(float p);
float quadraticEaseInf(float p);
float quadraticEaseOutf(float p);
float quadraticEaseInOutf(float p);
float cubicEaseInf(float p);
float cubicEaseOutf(float p);
float cubicEaseInOutf(float p);
float quarticEaseInf(float p);
float quarticEaseOutf(float p);
float quarticEaseInOutf(float p);
float quinticEaseInf(float p);
float quinticEaseOutf(float p);
float quinticEaseInOutf(float p);
float sineEaseInf(float p);
float sineEaseOutf(float p);
float sineEaseInOutf(float p);
float circularEaseInf(float p);
float circularEaseOutf(float p);
float circularEaseInOutf(float p);
float exponentialEaseInf(float p);
float exponentialEaseOutf(float p);
float exponentialEaseInOutf(float p);
float elasticEaseInf(float p);
float elasticEaseOutf(float p);
float elasticEaseInOutf(float p);
float backEaseInf(float p);
float backEaseOutf(float p);
float backEaseInOutf(float p);
float bounceEaseInf(float p);
float bounceEaseOutf(float p);
float bounceEaseInOutf(float p);

// Double precision easing functions
double linearInterpolationd(double p);
double quadraticEaseInd(double p);
double quadraticEaseOutd(double p);
double quadraticEaseInOutd(double p);
double cubicEaseInd(double p);
double cubicEaseOutd(double p);
double cubicEaseInOutd(double p);
double quarticEaseInd(double p);
double quarticEaseOutd(double p);
double quarticEaseInOutd(double p);
double quinticEaseInd(double p);
double quinticEaseOutd(double p);
double quinticEaseInOutd(double p);
double sineEaseInd(double p);
double sineEaseOutd(double p);
double sineEaseInOutd(double p);
double circularEaseInd(double p);
double circularEaseOutd(double p);
double circularEaseInOutd(double p);
double exponentialEaseInd(double p);
double exponentialEaseOutd(double p);
double exponentialEaseInOutd(double p);
double elasticEaseInd(double p);
double elasticEaseOutd(double p);
double elasticEaseInOutd(double p);
double backEaseInd(double p);
double backEaseOutd(double p);
double backEaseInOutd(double p);
double bounceEaseInd(double p);
double bounceEaseOutd(double p);
double bounceEaseInOutd(double p);

#ifdef __cplusplus
}
#endif

// C++ utility for name-based lookup
#ifdef __cplusplus
#include <string.h>

typedef float (*EasingFunction)(float);

struct EasingLookupEntry {
	const char* name;
	EasingFunction func;
};

static const EasingLookupEntry EASING_LOOKUP[] = {
    {"linear", linearInterpolationf},
    {"quadraticIn", quadraticEaseInf},
    {"quadraticOut", quadraticEaseOutf},
    {"quadraticInOut", quadraticEaseInOutf},
    {"cubicIn", cubicEaseInf},
    {"cubicOut", cubicEaseOutf},
    {"cubicInOut", cubicEaseInOutf},
    {"quarticIn", quarticEaseInf},
    {"quarticOut", quarticEaseOutf},
    {"quarticInOut", quarticEaseInOutf},
    {"quinticIn", quinticEaseInf},
    {"quinticOut", quinticEaseOutf},
    {"quinticInOut", quinticEaseInOutf},
    {"sineIn", sineEaseInf},
    {"sineOut", sineEaseOutf},
    {"sineInOut", sineEaseInOutf},
    {"circularIn", circularEaseInf},
    {"circularOut", circularEaseOutf},
    {"circularInOut", circularEaseInOutf},
    {"exponentialIn", exponentialEaseInf},
    {"exponentialOut", exponentialEaseOutf},
    {"exponentialInOut", exponentialEaseInOutf},
    {"elasticIn", elasticEaseInf},
    {"elasticOut", elasticEaseOutf},
    {"elasticInOut", elasticEaseInOutf},
    {"backIn", backEaseInf},
    {"backOut", backEaseOutf},
    {"backInOut", backEaseInOutf},
    {"bounceIn", bounceEaseInf},
    {"bounceOut", bounceEaseOutf},
    {"bounceInOut", bounceEaseInOutf},
};

static const size_t EASING_LOOKUP_SIZE = sizeof(EASING_LOOKUP) / sizeof(EASING_LOOKUP[0]);

inline EasingFunction getEasingFunction(const char* name) {
	for (size_t i = 0; i < EASING_LOOKUP_SIZE; i++) {
		if (strcmp(name, EASING_LOOKUP[i].name) == 0) {
			return EASING_LOOKUP[i].func;
		}
	}
	// Default to quadratic ease out
	return quadraticEaseOutf;
}

#endif // __cplusplus

#endif // EASING_H
