import type { ProjectPhase } from "./types/project";

export type ProjectStatus = ProjectPhase;

export interface Project {
  id: string;
  name: string;
  location: string;
  capacityMWp: number;
  status: ProjectPhase;
  deadline: string;
  valueEur: number;
  client: string;
}

export interface KpiCard {
  label: string;
  value: string;
  unit: string;
  delta: string;
  deltaPositive: boolean;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    id: "VPC-001",
    name: "Győr Ipari Park Napelem",
    location: "Győr",
    capacityMWp: 4.8,
    status: "construction",
    deadline: "2026-09-30",
    valueEur: 3_840_000,
    client: "Győri Ipari Kft.",
  },
  {
    id: "VPC-002",
    name: "Debrecen BESS Tároló",
    location: "Debrecen",
    capacityMWp: 2.0,
    status: "permitting",
    deadline: "2026-12-15",
    valueEur: 2_100_000,
    client: "DEO Energia Zrt.",
  },
  {
    id: "VPC-003",
    name: "Pécs Agro Solar",
    location: "Pécs",
    capacityMWp: 6.2,
    status: "planning",
    deadline: "2027-03-01",
    valueEur: 4_960_000,
    client: "Baranya Agro Kft.",
  },
  {
    id: "VPC-004",
    name: "Miskolc Közüzemi Park",
    location: "Miskolc",
    capacityMWp: 3.1,
    status: "warranty",
    deadline: "2025-12-31",
    valueEur: 2_480_000,
    client: "MIVÍZ Kft.",
  },
  {
    id: "VPC-005",
    name: "Sopron Logisztikai Csarnok",
    location: "Sopron",
    capacityMWp: 1.8,
    status: "closed",
    deadline: "2025-06-30",
    valueEur: 1_440_000,
    client: "Trans-Log Europe Kft.",
  },
  {
    id: "VPC-006",
    name: "Kecskemét Tejipari Üzem",
    location: "Kecskemét",
    capacityMWp: 2.5,
    status: "proposal",
    deadline: "2027-06-01",
    valueEur: 2_000_000,
    client: "Alföldi Tej Zrt.",
  },
  {
    id: "VPC-007",
    name: "Eger Szállodakomplex",
    location: "Eger",
    capacityMWp: 0.9,
    status: "cancelled",
    deadline: "2026-04-01",
    valueEur: 720_000,
    client: "Eger Resort Kft.",
  },
];

export const kpiCards: KpiCard[] = [
  {
    label: "Teljes portfólióérték",
    value: "17 540 000",
    unit: "EUR",
    delta: "+12% az előző negyedévhez képest",
    deltaPositive: true,
    featured: true,
  },
  {
    label: "Összes kapacitás",
    value: "21.30",
    unit: "MWp",
    delta: "+2.5 MWp folyamatban",
    deltaPositive: true,
  },
  {
    label: "Aktív projektek",
    value: "4",
    unit: "db",
    delta: "2 határidő közeledik",
    deltaPositive: false,
  },
  {
    label: "Teljesített projektek",
    value: "2",
    unit: "db",
    delta: "100% határidőn belül",
    deltaPositive: true,
  },
];
