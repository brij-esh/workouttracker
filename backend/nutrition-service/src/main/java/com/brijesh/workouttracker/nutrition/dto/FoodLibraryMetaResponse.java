package com.brijesh.workouttracker.nutrition.dto;

import java.util.List;

public record FoodLibraryMetaResponse(
        List<String> categories,
        List<String> regions,
        List<String> units
) {

    public static FoodLibraryMetaResponse defaults() {
        return new FoodLibraryMetaResponse(
                List.of("STAPLE", "MEAL", "CUSTOM"),
                List.of("PAN_INDIA", "NORTH", "SOUTH", "WEST", "EAST", "CENTRAL", "OTHER"),
                List.of("GRAMS", "ML", "PIECES", "SERVINGS", "CUPS")
        );
    }
}
