package com.brijesh.workouttracker.nutrition.repository;

import com.brijesh.workouttracker.nutrition.entity.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WaterLogRepository extends JpaRepository<WaterLog, UUID> {

    List<WaterLog> findAllByUserIdOrderByLoggedOnDesc(String userId);

    List<WaterLog> findAllByUserIdAndLoggedOnOrderByCreatedAtAsc(String userId, LocalDate loggedOn);

    Optional<WaterLog> findByIdAndUserId(UUID id, String userId);

    @Query("""
            select coalesce(sum(w.amountMl), 0)
            from WaterLog w
            where w.userId = :userId and w.loggedOn = :loggedOn
            """)
    Integer sumAmountMlByUserIdAndLoggedOn(
            @Param("userId") String userId,
            @Param("loggedOn") LocalDate loggedOn
    );
}
