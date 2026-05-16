import { useState, useEffect, useCallback } from "react";
import { Module } from "@/types/lms/course";
import { courses } from "@/data/lms/courses";

const STORAGE_KEY = "nexum-suum-training-progress";

interface ProgressData {
  [courseId: string]: number[]; // Array of completed module IDs
}

const loadProgress = (): ProgressData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const buildModulesFromProgress = (courseId: string, savedProgress: ProgressData): Module[] => {
  const course = courses.find(c => c.id === courseId);
  if (!course) return [];
  
  const completedIds = savedProgress[courseId] || [];
  
  return course.modules.map((module, index) => {
    const isCompleted = completedIds.includes(module.id);
    // First module is always unlocked, others unlock if previous is completed
    const isUnlocked = index === 0 || completedIds.includes(course.modules[index - 1].id);
    
    return {
      ...module,
      completed: isCompleted,
      locked: !isUnlocked,
    };
  });
};

export const useUserProgress = () => {
  const [savedProgress, setSavedProgress] = useState<ProgressData>(loadProgress);

  // Persist to localStorage whenever progress changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProgress));
  }, [savedProgress]);

  const saveProgress = useCallback((courseId: string, moduleId: number) => {
    setSavedProgress(prev => {
      const courseProgress = prev[courseId] || [];
      if (courseProgress.includes(moduleId)) return prev;
      return {
        ...prev,
        [courseId]: [...courseProgress, moduleId],
      };
    });
  }, []);

  const getCourseModules = useCallback((courseId: string): Module[] => {
    return buildModulesFromProgress(courseId, savedProgress);
  }, [savedProgress]);

  const getCourseProgress = useCallback((courseId: string) => {
    const modules = getCourseModules(courseId);
    return {
      completed: modules.filter(m => m.completed).length,
      total: modules.length,
    };
  }, [getCourseModules]);

  const resetProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedProgress({});
  }, []);

  return { getCourseModules, getCourseProgress, loading: false, saveProgress, resetProgress };
};
