CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"industry" varchar(255),
	"sales" numeric(18, 2),
	"employees" integer,
	"address" text,
	"city" varchar(255),
	"state" varchar(50) DEFAULT 'Minnesota',
	"postalCode" varchar(20),
	"phone" varchar(50),
	"website" varchar(500),
	"description" text,
	"tradestyle" varchar(255),
	"ticker" varchar(10),
	"ownership" varchar(100),
	"naicsDescription" text,
	"sicDescription" text,
	"isHeadquarters" boolean DEFAULT false,
	"employeesSite" varchar(50),
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "industries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"companyCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "industries_name_unique" UNIQUE("name")
);
