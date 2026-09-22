package com.brijesh.workouttracker.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.YearMonth;

/**
 * Resolves the caller's calendar timezone from {@link SecurityHeaders#USER_TIMEZONE}.
 * Falls back to UTC when missing or invalid.
 */
public final class RequestClock {

    private static final ZoneId FALLBACK = ZoneId.of("UTC");

    private RequestClock() {
    }

    public static ZoneId zone() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return FALLBACK;
        }
        return zoneOf(request.getHeader(SecurityHeaders.USER_TIMEZONE));
    }

    public static ZoneId zoneOf(String timezoneId) {
        if (timezoneId == null || timezoneId.isBlank()) {
            return FALLBACK;
        }
        try {
            return ZoneId.of(timezoneId.trim());
        } catch (Exception ignored) {
            return FALLBACK;
        }
    }

    public static LocalDate today() {
        return LocalDate.now(zone());
    }

    public static YearMonth currentMonth() {
        return YearMonth.now(zone());
    }

    private static HttpServletRequest currentRequest() {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes servletAttrs) {
            return servletAttrs.getRequest();
        }
        return null;
    }
}
