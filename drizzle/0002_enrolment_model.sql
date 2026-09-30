CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`kind` text NOT NULL,
	`day` integer NOT NULL,
	`start_min` integer NOT NULL,
	`end_min` integer NOT NULL,
	`location` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `classes_course_idx` ON `classes` (`course_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`units` integer NOT NULL,
	`career` text NOT NULL,
	`session` text NOT NULL,
	`mode` text NOT NULL,
	`convenor` text NOT NULL,
	`description` text NOT NULL,
	`quota` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_code_unique` ON `courses` (`code`);--> statement-breakpoint
CREATE INDEX `courses_session_idx` ON `courses` (`session`);--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`status` text DEFAULT 'enrolled' NOT NULL,
	`grade` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_student_course_idx` ON `enrolments` (`student_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `enrolments_course_idx` ON `enrolments` (`course_id`);--> statement-breakpoint
CREATE TABLE `prerequisites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`requires_code` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prerequisites_course_idx` ON `prerequisites` (`course_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`name` text NOT NULL,
	`program` text NOT NULL,
	`career` text NOT NULL,
	`unit_cap` integer DEFAULT 24 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_uid_unique` ON `students` (`uid`);