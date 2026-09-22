package com.brijesh.workouttracker.workout.controller;

import com.brijesh.workouttracker.workout.service.WorkoutBadRequestException;
import com.brijesh.workouttracker.workout.service.WorkoutExerciseNotFoundException;
import com.brijesh.workouttracker.workout.service.WorkoutNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(WorkoutNotFoundException.class)
    public ProblemDetail handleWorkoutNotFound(WorkoutNotFoundException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                exception.getMessage()
        );
        problemDetail.setTitle("Workout not found");
        return problemDetail;
    }

    @ExceptionHandler(WorkoutExerciseNotFoundException.class)
    public ProblemDetail handleExerciseNotFound(WorkoutExerciseNotFoundException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                exception.getMessage()
        );
        problemDetail.setTitle("Workout exercise not found");
        return problemDetail;
    }

    @ExceptionHandler(WorkoutBadRequestException.class)
    public ProblemDetail handleBadRequest(WorkoutBadRequestException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
        );
        problemDetail.setTitle("Invalid request");
        return problemDetail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationError(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .findFirst()
                .orElse("Invalid request");

        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, message);
    }
}
