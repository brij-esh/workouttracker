package com.brijesh.workouttracker.notification.service;

import com.brijesh.workouttracker.notification.entity.NotificationRecipient;
import com.brijesh.workouttracker.notification.repository.NotificationRecipientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationRecipientService {

    private final NotificationRecipientRepository recipientRepository;

    @Transactional
    public void register(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        if (recipientRepository.existsById(userId)) {
            return;
        }
        recipientRepository.save(new NotificationRecipient(userId.trim()));
    }

    @Transactional(readOnly = true)
    public List<String> allUserIds() {
        return recipientRepository.findAll().stream()
                .map(NotificationRecipient::getUserId)
                .toList();
    }
}
