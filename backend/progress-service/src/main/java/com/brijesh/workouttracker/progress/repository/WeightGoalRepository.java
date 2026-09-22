package com.brijesh.workouttracker.progress.repository;

import com.brijesh.workouttracker.progress.entity.WeightGoal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeightGoalRepository extends JpaRepository<WeightGoal, String> {
}
