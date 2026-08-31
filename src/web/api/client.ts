/**
 * Thin `fetch` wrappers over the SPA REST surface (design.md File Changes;
 * src/api/routes/{batches,write}.ts): `GET /api/batches/:batchId`,
 * `PUT /api/batches/:batchId/codes/:codeId/fields/:field`,
 * `POST /api/batches/:id/write-plan`, `POST /api/batches/:id/write-commit`.
 * No business logic here — HTTP <-> typed-response translation only, same
 * boundary discipline as the API routes themselves.
 */
import type { BatchAnalysis } from "../../domain/types.js";
import type { WritePlan } from "../../ports/ReviewStateStore.js";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchBatch(batchId: string): Promise<BatchAnalysis> {
  const response = await fetch(`/api/batches/${encodeURIComponent(batchId)}`);
  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError(`No se pudo cargar el lote ${batchId}.`, response.status, body);
  }
  const data = (await response.json()) as { batch: BatchAnalysis };
  return data.batch;
}

export async function putFieldOverride(
  batchId: string,
  codeId: string,
  field: string,
  body: { value: string; valueId?: number },
): Promise<void> {
  const response = await fetch(
    `/api/batches/${encodeURIComponent(batchId)}/codes/${encodeURIComponent(codeId)}/fields/${encodeURIComponent(field)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const errBody = await parseErrorBody(response);
    throw new ApiError("No se pudo guardar el cambio.", response.status, errBody);
  }
}

export async function postWritePlan(batchId: string): Promise<WritePlan> {
  const response = await fetch(`/api/batches/${encodeURIComponent(batchId)}/write-plan`, {
    method: "POST",
  });
  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError("No se pudo preparar el plan de alta.", response.status, body);
  }
  const data = (await response.json()) as { plan: WritePlan };
  return data.plan;
}

export interface WriteCommitResult {
  status: number;
  committed: boolean;
  message?: string;
}

export async function postWriteCommit(batchId: string, planId: string): Promise<WriteCommitResult> {
  const response = await fetch(`/api/batches/${encodeURIComponent(batchId)}/write-commit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  const data = (await response.json().catch(() => ({}))) as { committed?: boolean; message?: string };
  return {
    status: response.status,
    committed: data.committed === true,
    ...(data.message !== undefined ? { message: data.message } : {}),
  };
}
