import { IsArray, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @IsString() @Length(2, 50) name: string;
  @IsString() @Length(2, 100) label: string;
  @IsArray() @IsString({ each: true }) permissions: string[];
}

export class UpdateRolePermissionsDto {
  @IsArray() @IsString({ each: true }) permissions: string[];
}
