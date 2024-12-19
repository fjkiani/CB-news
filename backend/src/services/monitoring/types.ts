export interface ChangeDetectionResult {
  hasChanged: boolean;
  currentUrl?: string;
}

export interface IChangeDetectionService {
  checkForChanges(): Promise<ChangeDetectionResult>;
} 