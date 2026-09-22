package com.brijesh.workouttracker.security;

/**
 * Trusted headers used between the API Gateway and downstream services.
 * Clients must never be able to set USER_ID / USER_EMAIL / GATEWAY_TOKEN successfully
 * on direct service calls.
 *
 * USER_TIMEZONE / USER_REGION are client hints for calendar and localization only.
 */
public final class SecurityHeaders {

    public static final String USER_ID = "X-User-Id";
    public static final String USER_EMAIL = "X-User-Email";
    public static final String GATEWAY_TOKEN = "X-Gateway-Token";
    public static final String USER_TIMEZONE = "X-User-Timezone";
    public static final String USER_REGION = "X-User-Region";

    private SecurityHeaders() {
    }
}
