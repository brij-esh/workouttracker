package com.brijesh.workouttracker.notification.quote;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class MotivationalQuoteClient {

    private static final Logger log = LoggerFactory.getLogger(MotivationalQuoteClient.class);

    private static final List<MotivationalQuote> LOCAL_QUOTES = List.of(
            new MotivationalQuote("The only bad workout is the one that didn’t happen.", "Unknown"),
            new MotivationalQuote("Success is the sum of small efforts repeated day in and day out.", "Robert Collier"),
            new MotivationalQuote("It does not matter how slowly you go as long as you do not stop.", "Confucius"),
            new MotivationalQuote("The body achieves what the mind believes.", "Napoleon Hill"),
            new MotivationalQuote("Discipline is choosing between what you want now and what you want most.", "Abraham Lincoln"),
            new MotivationalQuote("You don’t have to be extreme, just consistent.", "Unknown"),
            new MotivationalQuote("Strength does not come from winning. Your struggles develop your strengths.", "Arnold Schwarzenegger"),
            new MotivationalQuote("Don’t limit your challenges. Challenge your limits.", "Jerry Dunn"),
            new MotivationalQuote("The difference between try and triumph is just a little umph.", "Marvin Phillips"),
            new MotivationalQuote("Take care of your body. It’s the only place you have to live.", "Jim Rohn")
    );

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();
    private final ObjectMapper objectMapper;

    public MotivationalQuoteClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public MotivationalQuote fetchQuote() {
        try {
            return fetchDummyJson();
        } catch (Exception first) {
            log.debug("DummyJSON quote fetch failed: {}", first.toString());
            try {
                return fetchZenQuotes();
            } catch (Exception second) {
                log.warn("Online quote fetch failed; using local fallback. reason={}", second.toString());
                return localQuote();
            }
        }
    }

    private MotivationalQuote fetchDummyJson() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://dummyjson.com/quotes/random"))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("DummyJSON status " + response.statusCode());
        }
        JsonNode root = objectMapper.readTree(response.body());
        String text = textOrNull(root.get("quote"));
        String author = textOrNull(root.get("author"));
        if (text == null || author == null) {
            throw new IllegalStateException("DummyJSON returned empty quote");
        }
        return new MotivationalQuote(text, author);
    }

    private MotivationalQuote fetchZenQuotes() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://zenquotes.io/api/random"))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("ZenQuotes status " + response.statusCode());
        }
        JsonNode root = objectMapper.readTree(response.body());
        JsonNode first = root.isArray() && !root.isEmpty() ? root.get(0) : root;
        String text = textOrNull(first.get("q"));
        String author = textOrNull(first.get("a"));
        if (text == null || author == null) {
            throw new IllegalStateException("ZenQuotes returned empty quote");
        }
        return new MotivationalQuote(text, author);
    }

    private MotivationalQuote localQuote() {
        int index = ThreadLocalRandom.current().nextInt(LOCAL_QUOTES.size());
        return LOCAL_QUOTES.get(index);
    }

    private static String textOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String value = node.asText(null);
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
