
export interface IConfigService {
  get(key: string): string;
  getEnv(): string;
}
