CREATE TABLE library_exercises (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128),
    name VARCHAR(150) NOT NULL,
    muscle_group VARCHAR(80) NOT NULL,
    equipment VARCHAR(80),
    instructions TEXT,
    difficulty VARCHAR(30),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT chk_library_exercises_difficulty
        CHECK (difficulty IS NULL OR difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED'))
);

CREATE INDEX idx_library_exercises_catalog
    ON library_exercises (archived, muscle_group, equipment);

CREATE INDEX idx_library_exercises_user
    ON library_exercises (user_id, archived, name);

CREATE INDEX idx_library_exercises_name
    ON library_exercises (lower(name));

-- System catalog (user_id NULL)
INSERT INTO library_exercises (id, user_id, name, muscle_group, equipment, instructions, difficulty, archived, created_at, updated_at) VALUES
(gen_random_uuid(), NULL, 'Barbell Bench Press', 'CHEST', 'BARBELL',
 '1. Lie on a flat bench with feet planted.
2. Grip the bar slightly wider than shoulder width.
3. Unrack, lower to mid-chest with control.
4. Press up until elbows lock out without bouncing.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Incline Dumbbell Press', 'CHEST', 'DUMBBELL',
 '1. Set bench to ~30–45°.
2. Press dumbbells from chest level upward.
3. Lower with control until elbows are below the bench line.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Push-Up', 'CHEST', 'BODYWEIGHT',
 '1. Hands under shoulders, body in a straight line.
2. Lower chest toward the floor.
3. Press back to full lockout without sagging hips.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Cable Fly', 'CHEST', 'CABLE',
 '1. Set cables at chest height.
2. Step forward, slight bend in elbows.
3. Bring handles together in an arc, squeeze chest, return slowly.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Conventional Deadlift', 'BACK', 'BARBELL',
 '1. Stand with mid-foot under the bar, hinge at hips.
2. Grip just outside legs, brace core, flat back.
3. Drive floor away, stand tall, then reverse the hinge.', 'ADVANCED', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Barbell Row', 'BACK', 'BARBELL',
 '1. Hinge to ~45°, bar hanging at arms length.
2. Pull bar to lower ribs / upper abs.
3. Lower under control; keep torso angle steady.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Lat Pulldown', 'BACK', 'CABLE',
 '1. Grip bar wider than shoulders.
2. Pull to upper chest, elbows down and back.
3. Control the return without shrugging.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Pull-Up', 'BACK', 'BODYWEIGHT',
 '1. Hang from a bar with a shoulder-width or wider grip.
2. Pull until chin clears the bar.
3. Lower fully with control.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Seated Cable Row', 'BACK', 'CABLE',
 '1. Sit tall, slight knee bend, torso upright.
2. Pull handle to torso, squeeze shoulder blades.
3. Extend arms without rounding the lower back.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Overhead Press', 'SHOULDERS', 'BARBELL',
 '1. Bar at front rack / upper chest.
2. Brace, press overhead to lockout.
3. Lower to the start without excessive lean.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Dumbbell Shoulder Press', 'SHOULDERS', 'DUMBBELL',
 '1. Seated or standing, dumbbells at ear height.
2. Press up until arms are nearly locked.
3. Lower with control.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Lateral Raise', 'SHOULDERS', 'DUMBBELL',
 '1. Slight elbow bend, raise arms to the sides.
2. Stop around shoulder height.
3. Lower slowly; avoid swinging.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Face Pull', 'SHOULDERS', 'CABLE',
 '1. Rope at upper-chest / face height.
2. Pull toward face, elbows high, external rotation.
3. Squeeze rear delts, return slowly.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Barbell Curl', 'BICEPS', 'BARBELL',
 '1. Arms at sides, elbows pinned.
2. Curl bar to shoulder height without swinging.
3. Lower under control.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Dumbbell Curl', 'BICEPS', 'DUMBBELL',
 '1. Curl one or both dumbbells with elbows fixed.
2. Squeeze at the top.
3. Lower fully without locking out harshly.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Tricep Pushdown', 'TRICEPS', 'CABLE',
 '1. Elbows pinned to sides.
2. Extend the cable down to full lockout.
3. Control the return.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Skull Crusher', 'TRICEPS', 'BARBELL',
 '1. Lie on a bench, bar over shoulders.
2. Bend elbows to lower bar toward forehead / behind head.
3. Extend back to start.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Back Squat', 'LEGS', 'BARBELL',
 '1. Bar on upper back, feet roughly shoulder-width.
2. Sit down and back, knees track over toes.
3. Drive up to stand while keeping chest up.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Front Squat', 'LEGS', 'BARBELL',
 '1. Bar in front rack, elbows high.
2. Squat deep while keeping torso upright.
3. Drive up without letting elbows drop.', 'ADVANCED', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Romanian Deadlift', 'LEGS', 'BARBELL',
 '1. Soft knees, hinge hips back.
2. Lower bar along thighs until hamstrings stretch.
3. Drive hips forward to stand.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Leg Press', 'LEGS', 'MACHINE',
 '1. Feet mid-platform, shoulder-width.
2. Lower until knees approach ~90°.
3. Press without locking knees harshly.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Walking Lunge', 'LEGS', 'DUMBBELL',
 '1. Step forward into a lunge, rear knee toward floor.
2. Drive through front foot to next step.
3. Keep torso upright.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Leg Curl', 'LEGS', 'MACHINE',
 '1. Pad on lower calves, hips glued to pad.
2. Curl heels toward glutes.
3. Lower with control.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Calf Raise', 'LEGS', 'MACHINE',
 '1. Balls of feet on platform, full stretch at bottom.
2. Rise onto toes, pause briefly.
3. Lower slowly through full range.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Hip Thrust', 'GLUTES', 'BARBELL',
 '1. Upper back on bench, bar over hips.
2. Drive hips up until torso is flat.
3. Squeeze glutes, lower with control.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Plank', 'CORE', 'BODYWEIGHT',
 '1. Forearms and toes on floor, body straight.
2. Brace abs, squeeze glutes.
3. Hold without letting hips sag or pike.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Hanging Leg Raise', 'CORE', 'BODYWEIGHT',
 '1. Hang from a bar, slight hollow body.
2. Raise legs (bent or straight) toward hip height or higher.
3. Lower without swinging.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Cable Crunch', 'CORE', 'CABLE',
 '1. Kneel facing a high cable with rope.
2. Crunch elbows toward hips, flex the spine.
3. Return without yanking the low back.', 'BEGINNER', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Kettlebell Swing', 'FULL_BODY', 'KETTLEBELL',
 '1. Hinge, hike the bell between legs.
2. Snap hips to swing bell to chest height.
3. Soft landing of the hinge; power from hips not arms.', 'INTERMEDIATE', FALSE, NOW(), NOW()),
(gen_random_uuid(), NULL, 'Band Pull-Apart', 'SHOULDERS', 'BAND',
 '1. Hold a band at shoulder height, arms extended.
2. Pull apart until band touches chest.
3. Control the return.', 'BEGINNER', FALSE, NOW(), NOW());
