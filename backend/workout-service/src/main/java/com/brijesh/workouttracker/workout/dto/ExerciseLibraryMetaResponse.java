package com.brijesh.workouttracker.workout.dto;

import com.brijesh.workouttracker.workout.domain.EquipmentType;
import com.brijesh.workouttracker.workout.domain.MuscleGroup;

import java.util.Arrays;
import java.util.List;

public record ExerciseLibraryMetaResponse(
        List<String> muscleGroups,
        List<String> equipment
) {

    public static ExerciseLibraryMetaResponse defaults() {
        return new ExerciseLibraryMetaResponse(
                Arrays.stream(MuscleGroup.values()).map(Enum::name).toList(),
                Arrays.stream(EquipmentType.values()).map(Enum::name).toList()
        );
    }
}
