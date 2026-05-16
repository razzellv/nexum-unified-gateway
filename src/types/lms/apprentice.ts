export interface ApprenticeQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ApprenticeScenario {
  title: string;
  description: string;
  question: string;
  correctAnswer: string;
}

export interface ApprenticeModuleContent {
  title: string;
  narration: string;
  scenario: ApprenticeScenario;
  standards: string[];
  quiz: ApprenticeQuizQuestion[];
  reflection: string;
}

export interface ApprenticeModule {
  id: number;
  title: string;
  duration: string;
  description: string;
  topics: string[];
  completed: boolean;
  locked: boolean;
}
