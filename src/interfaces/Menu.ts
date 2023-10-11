interface WeeklyMenu {
    days: DailyMenu[]
}

interface DailyMenu {
    date?: string,
    courses: Course[],
}

interface Course {
    price: string;
    name: string;
    diets: string[];
}

export type {WeeklyMenu, DailyMenu}
