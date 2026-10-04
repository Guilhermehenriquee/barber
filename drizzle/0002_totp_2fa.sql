ALTER TABLE `users` ADD `two_factor_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_confirmed_at` text;--> statement-breakpoint
UPDATE `users` SET `two_factor_channel` = 'totp' WHERE `two_factor_channel` = 'email';
