package rooty.finance.financebackend.api;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import rooty.finance.financebackend.api.dto.CategoryAmountDto;
import rooty.finance.financebackend.api.dto.MonthSummaryDto;
import rooty.finance.financebackend.api.dto.NetWorthPointDto;
import rooty.finance.financebackend.service.AnalyticsService;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/month-summary")
    public MonthSummaryDto getMonthSummary(@RequestParam int year, @RequestParam int month) {
        return analyticsService.getMonthSummary(year, month);
    }

    @GetMapping("/category-breakdown")
    public List<CategoryAmountDto> getCategoryBreakdown(@RequestParam int year, @RequestParam int month) {
        return analyticsService.getCategoryBreakdown(YearMonth.of(year, month));
    }

    @GetMapping("/net-worth-trend")
    public List<NetWorthPointDto> getNetWorthTrend(
            @RequestParam("from") LocalDate from, @RequestParam("to") LocalDate to) {
        return analyticsService.getNetWorthTrend(from, to);
    }
}
