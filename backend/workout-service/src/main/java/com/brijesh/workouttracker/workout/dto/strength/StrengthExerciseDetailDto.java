package com.brijesh.workouttracker.workout.dto.strength;

import java.util.List;

public record StrengthExerciseDetailDto(
        StrengthExerciseSummaryDto summary,
        List<StrengthSessionPointDto> oneRmHistory,
        StrengthProgressionDto progression
) {
}
