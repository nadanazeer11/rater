export class CustomerResponseDto {
  id!: string;
  email!: string;
  name!: string | null;
  phone!: string | null;
  emailStatus!: string;
  importSource!: string;
  importedAt!: Date;
  createdAt!: Date;
}
