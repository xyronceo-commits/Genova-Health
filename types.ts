
export enum BloodGroup {
  A_POS = 'A+', A_NEG = 'A-', B_POS = 'B+', B_NEG = 'B-', 
  AB_POS = 'AB+', AB_NEG = 'AB-', O_POS = 'O+', O_NEG = 'O-'
}

export enum Genotype {
  AA = 'AA', AS = 'AS', SS = 'SS', AC = 'AC', SC = 'SC'
}

export interface UserProfile {
  fullName: string;
  age: number;
  gender: 'male' | 'female';
  bloodGroup: BloodGroup;
  genotype: Genotype;
  height: number; // in cm
  weight: number; // in kg
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  stepGoal: number;
  subscriptionStatus: 'free' | 'premium';
}

export interface HealthMetrics {
  heartRate: number;
  bloodPressure: string;
  stressLevel: 'Low' | 'Medium' | 'High';
  steps: number;
  timestamp: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AssistantType {
  NURSE = 'Nurse',
  NUTRITIONIST = 'Nutritionist',
  FITNESS = 'Fitness Coach',
  MENTAL = 'Wellness Coach',
  SYMPTOM_CHECKER = 'Symptom Checker',
  FAMILY = 'Family Health'
}
