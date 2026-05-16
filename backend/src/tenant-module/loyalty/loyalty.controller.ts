import {
  Body, Controller, Get, Param, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoyaltyService } from './loyalty.service';
import {
  UpdateLoyaltyConfigDto, RedeemPreviewDto,
  EarnPointsDto, AdjustPointsDto, LoyaltyTxFilterDto,
} from './dto/loyalty.dto';

@ApiTags('Tenant / Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant/loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  // ─── Config ───────────────────────────────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'Get loyalty program configuration' })
  getConfig() {
    return this.service.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Update loyalty program configuration' })
  updateConfig(@Body() dto: UpdateLoyaltyConfigDto) {
    return this.service.updateConfig(dto);
  }

  // ─── Customer Loyalty ─────────────────────────────────────────────────────

  @Get('customers/:id/points')
  @ApiOperation({ summary: 'Get customer loyalty summary' })
  getCustomerLoyalty(@Param('id') id: string) {
    return this.service.getCustomerLoyalty(id);
  }

  // ─── Redeem ───────────────────────────────────────────────────────────────

  @Post('redeem-preview')
  @ApiOperation({ summary: 'Preview point redemption value' })
  redeemPreview(@Body() dto: RedeemPreviewDto) {
    return this.service.redeemPreview(dto);
  }

  // ─── Manual Earn ──────────────────────────────────────────────────────────

  @Post('earn')
  @ApiOperation({ summary: 'Manually earn points for a customer' })
  earnPoints(
    @Body() dto: EarnPointsDto,
    @CurrentUser() user: any,
  ) {
    return this.service.earnPoints(dto, user.sub);
  }

  // ─── Adjust ───────────────────────────────────────────────────────────────

  @Post('adjust')
  @ApiOperation({ summary: 'Adjust points (positive or negative)' })
  adjustPoints(
    @Body() dto: AdjustPointsDto,
    @CurrentUser() user: any,
  ) {
    return this.service.adjustPoints(dto, user.sub);
  }

  // ─── All Transactions ─────────────────────────────────────────────────────

  @Get('transactions')
  @ApiOperation({ summary: 'List all loyalty transactions' })
  listTransactions(@Query() filter: LoyaltyTxFilterDto) {
    return this.service.listTransactions(filter);
  }

  // ─── Evaluate Tiers (manual trigger for testing) ──────────────────────────

  @Post('evaluate-tiers/:customerId')
  @ApiOperation({ summary: 'Manually trigger tier evaluation for a customer' })
  evaluateTier(@Param('customerId') customerId: string) {
    return this.service.evaluateTierForCustomer(customerId);
  }
}
