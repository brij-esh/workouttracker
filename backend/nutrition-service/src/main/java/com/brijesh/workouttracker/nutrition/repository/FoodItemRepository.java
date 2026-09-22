package com.brijesh.workouttracker.nutrition.repository;

import com.brijesh.workouttracker.nutrition.domain.FoodCategory;
import com.brijesh.workouttracker.nutrition.domain.FoodRegion;
import com.brijesh.workouttracker.nutrition.entity.FoodItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodItemRepository extends JpaRepository<FoodItem, UUID> {

    Optional<FoodItem> findByIdAndArchivedFalse(UUID id);

    @Query("""
            SELECT f FROM FoodItem f
            WHERE f.archived = false
              AND (
                    f.systemFood = true
                    OR f.userId = :userId
                  )
              AND (:category IS NULL OR f.category = :category)
              AND (:region IS NULL OR f.region = :region)
              AND (
                    :q IS NULL
                    OR LOWER(f.name) LIKE LOWER(CONCAT('%', :q, '%'))
                  )
            ORDER BY
              CASE WHEN f.systemFood = true THEN 0 ELSE 1 END,
              f.name ASC
            """)
    List<FoodItem> search(
            @Param("userId") String userId,
            @Param("q") String q,
            @Param("category") FoodCategory category,
            @Param("region") FoodRegion region
    );
}
