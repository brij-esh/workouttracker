package com.brijesh.workouttracker.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GatewayInternalAuthFilterTest {

    @Test
    void rejectsMissingToken() throws Exception {
        GatewayInternalAuthProperties properties = new GatewayInternalAuthProperties();
        properties.setGatewayToken("secret");
        GatewayInternalAuthFilter filter = new GatewayInternalAuthFilter(properties);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/users/me");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
    }

    @Test
    void allowsMatchingToken() throws Exception {
        GatewayInternalAuthProperties properties = new GatewayInternalAuthProperties();
        properties.setGatewayToken("secret");
        GatewayInternalAuthFilter filter = new GatewayInternalAuthFilter(properties);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/users/me");
        request.addHeader(SecurityHeaders.GATEWAY_TOKEN, "secret");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void allowsActuatorWithoutToken() throws Exception {
        GatewayInternalAuthProperties properties = new GatewayInternalAuthProperties();
        properties.setGatewayToken("secret");
        GatewayInternalAuthFilter filter = new GatewayInternalAuthFilter(properties);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }
}
