import type { Customer } from '@rater/db';
import { CustomerResponseDto } from './dto/customer.response';

export function toCustomerResponse(c: Customer): CustomerResponseDto {
  return {
    id: c.id,
    email: c.email,
    name: c.name,
    phone: c.phone,
    emailStatus: c.emailStatus,
    importSource: c.importSource,
    importedAt: c.importedAt,
    createdAt: c.createdAt,
  };
}
