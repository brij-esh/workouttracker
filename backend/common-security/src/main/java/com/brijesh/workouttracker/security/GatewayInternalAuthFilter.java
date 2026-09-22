package com.brijesh.workouttracker.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Rejects direct calls to a service unless the request carries the shared
 * gateway token. Actuator endpoints remain reachable for health probes.
 */
public class GatewayInternalAuthFilter extends OncePerRequestFilter {

    private final GatewayInternalAuthProperties properties;

    public GatewayInternalAuthFilter(GatewayInternalAuthProperties properties) {
        this.properties = properties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!properties.isRequireGatewayToken()) {
            return true;
        }

        String path = request.getRequestURI();
        return path.startsWith("/actuator");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String expected = properties.getGatewayToken();
        if (!StringUtils.hasText(expected)) {
            forbid(response, "Gateway token is not configured on this service");
            return;
        }

        String provided = request.getHeader(SecurityHeaders.GATEWAY_TOKEN);
        if (!constantTimeEquals(expected, provided)) {
            forbid(response, "Access allowed only through the API Gateway");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static void forbid(HttpServletResponse response, String detail) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.getWriter().write(
                "{\"type\":\"about:blank\",\"title\":\"Forbidden\",\"status\":403,\"detail\":\""
                        + detail
                        + "\"}"
        );
    }

    private static boolean constantTimeEquals(String expected, String provided) {
        if (!StringUtils.hasText(provided)) {
            return false;
        }

        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = provided.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
