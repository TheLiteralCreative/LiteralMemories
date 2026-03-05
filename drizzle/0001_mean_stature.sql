CREATE TABLE `saved_quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320) NOT NULL,
	`clientPhone` varchar(64),
	`projectNotes` text,
	`pricingTier` varchar(32) NOT NULL,
	`quoteData` text NOT NULL,
	`estimatedTotalCents` int NOT NULL DEFAULT 0,
	`depositAmountCents` int NOT NULL DEFAULT 0,
	`emailSent` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_quotes_id` PRIMARY KEY(`id`)
);
