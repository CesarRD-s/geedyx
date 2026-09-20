export type ApiMeta = {
  requestId: string;
};

export type ApiSuccess<T> = {
  data: T;
  meta: ApiMeta;
};

export type ProblemFieldError = {
  field?: string;
  code: string;
  message: string;
};

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  requestId: string;
  errors?: ProblemFieldError[];
};

export type InstallationStatus = 'PENDING' | 'COMPLETED';

export type SetupStatus = {
  installationStatus: InstallationStatus;
  ready: boolean;
};

export type OwnerCreated = {
  owner: {
    id: string;
    displayName: string;
    email: string;
  };
  installationStatus: 'COMPLETED';
};
