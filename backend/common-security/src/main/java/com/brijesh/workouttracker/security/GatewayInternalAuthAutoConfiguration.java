package com.brijesh.workouttracker.security;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@EnableConfigurationProperties(GatewayInternalAuthProperties.class)
@ConditionalOnProperty(
        prefix = "workout.security",
        name = "require-gateway-token",
        havingValue = "true",
        matchIfMissing = true
)
public class GatewayInternalAuthAutoConfiguration {

    @Bean
    public FilterRegistrationBean<GatewayInternalAuthFilter> gatewayInternalAuthFilter(
            GatewayInternalAuthProperties properties
    ) {
        FilterRegistrationBean<GatewayInternalAuthFilter> registration =
                new FilterRegistrationBean<>();
        registration.setFilter(new GatewayInternalAuthFilter(properties));
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 20);
        registration.setName("gatewayInternalAuthFilter");
        return registration;
    }
}
