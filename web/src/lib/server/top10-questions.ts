import type { Company } from "@eunicorn/schema";
import type { Difficulty } from "../difficulty";
import type { Top10Metric } from "../top10";

/**
 * The Top 10 question bank: every list the game can ask, chosen by hand rather than at random, so
 * the questions stay about places and topics players know (the UK, Germany, France and Sweden, the
 * big sectors) and small ones (Switzerland, Spain) only come up on Hard.
 *
 * A question belongs to the level it first appears on and is asked on every harder level too, like the
 * company tiers. Whether a list is possible is checked against the data each day (at least 12
 * companies with the number, no tie at No. 10), so a question that stops qualifying is skipped.
 */
export interface Top10Question {
  /** The first level that asks it. */
  level: Difficulty;
  /** What it is about; two days in a row never share a tag, so it isn't the UK twice running. */
  tag: string;
  metric: Top10Metric;
  title: string;
  filter: (c: Company) => boolean;
}

const VALUED: Top10Metric = "lastValuationUsd";
const RAISED: Top10Metric = "totalRaisedUsd";

const inCountry = (code: string) => (c: Company) => c.country === code;
const inSector = (s: string) => (c: Company) => c.sectors.includes(s as Company["sectors"][number]);
const inCity = (city: string) => (c: Company) => c.city === city;
const since = (year: number) => (c: Company) => c.founded >= year;
const before = (year: number) => (c: Company) => c.founded > 0 && c.founded < year;
const status = (s: Company["status"]) => (c: Company) => c.status === s;
const all = (...fs: ((c: Company) => boolean)[]) => (c: Company) => fs.every((f) => f(c));

const q = (level: Difficulty, tag: string, metric: Top10Metric, who: string, filter: (c: Company) => boolean): Top10Question => ({
  level,
  tag,
  metric,
  title: metric === VALUED ? `The 10 most valuable ${who}` : `The 10 ${who} that raised the most`,
  filter,
});

export const TOP10_QUESTIONS: Top10Question[] = [
  // Easy: Europe and the four big hubs (UK, Germany, France, Sweden), names everyone knows.
  q("easy", "europe", VALUED, "startups in Europe", () => true),
  q("easy", "europe", RAISED, "startups in Europe", () => true),
  q("easy", "europe", VALUED, "startups in Europe founded since 2015", since(2015)),
  q("easy", "gb", VALUED, "UK startups", inCountry("GB")),
  q("easy", "de", VALUED, "German startups", inCountry("DE")),
  q("easy", "fr", VALUED, "French startups", inCountry("FR")),
  q("easy", "de", RAISED, "German startups", inCountry("DE")),
  q("easy", "gb", RAISED, "UK startups", inCountry("GB")),
  q("easy", "fintech", VALUED, "fintech startups in Europe", inSector("fintech")),
  q("easy", "fintech", RAISED, "fintech startups in Europe", inSector("fintech")),
  q("easy", "ai", VALUED, "AI startups in Europe", inSector("ai")),
  q("easy", "consumer", VALUED, "consumer startups in Europe", inSector("consumer")),
  q("easy", "se", RAISED, "Swedish startups", inCountry("SE")),
  q("easy", "fr", RAISED, "French startups", inCountry("FR")),
  q("easy", "london", VALUED, "startups in London", inCity("London")),
  q("easy", "berlin", VALUED, "startups in Berlin", inCity("Berlin")),

  // Medium: Paris, more sectors, the exits and a few combinations.
  q("medium", "paris", VALUED, "startups in Paris", inCity("Paris")),
  q("medium", "mobility", RAISED, "mobility startups in Europe", inSector("mobility")),
  q("medium", "saas", VALUED, "SaaS startups in Europe", inSector("saas")),
  q("medium", "saas", RAISED, "SaaS startups in Europe", inSector("saas")),
  q("medium", "ai", RAISED, "AI startups in Europe", inSector("ai")),
  q("medium", "climate", RAISED, "climate startups in Europe", inSector("climate")),
  q("medium", "consumer", RAISED, "consumer startups in Europe", inSector("consumer")),
  q("medium", "acquired", VALUED, "acquired startups", status("acquired")),
  q("medium", "acquired", RAISED, "acquired startups", status("acquired")),
  q("medium", "listed", RAISED, "listed startups", status("public")),
  q("medium", "europe", RAISED, "startups in Europe founded since 2015", since(2015)),
  q("medium", "europe", VALUED, "startups in Europe founded before 2012", before(2012)),
  q("medium", "gb", VALUED, "UK fintech startups", all(inCountry("GB"), inSector("fintech"))),
  q("medium", "gb", VALUED, "UK AI startups", all(inCountry("GB"), inSector("ai"))),

  // Hard: smaller cities and countries, narrower sectors, combinations.
  q("hard", "munich", RAISED, "startups in Munich", inCity("Munich")),
  q("hard", "stockholm", RAISED, "startups in Stockholm", inCity("Stockholm")),
  q("hard", "amsterdam", RAISED, "startups in Amsterdam", inCity("Amsterdam")),
  q("hard", "berlin", RAISED, "startups in Berlin", inCity("Berlin")),
  q("hard", "paris", RAISED, "startups in Paris", inCity("Paris")),
  q("hard", "london", RAISED, "startups in London", inCity("London")),
  q("hard", "health", RAISED, "health startups in Europe", inSector("health")),
  q("hard", "biotech", RAISED, "biotech startups in Europe", inSector("biotech")),
  q("hard", "de", RAISED, "German fintech startups", all(inCountry("DE"), inSector("fintech"))),
  q("hard", "de", RAISED, "German AI startups", all(inCountry("DE"), inSector("ai"))),
  q("hard", "de", RAISED, "German climate startups", all(inCountry("DE"), inSector("climate"))),
  q("hard", "gb", RAISED, "UK fintech startups", all(inCountry("GB"), inSector("fintech"))),
  q("hard", "gb", RAISED, "UK AI startups", all(inCountry("GB"), inSector("ai"))),
  q("hard", "nl", RAISED, "Dutch startups", inCountry("NL")),
  q("hard", "es", RAISED, "Spanish startups", inCountry("ES")),
  q("hard", "ch", RAISED, "Swiss startups", inCountry("CH")),
  q("hard", "europe", RAISED, "startups in Europe founded before 2012", before(2012)),
];
