package rooty.finance.financebackend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RecurringRuleAutoPostJob {

    private static final Logger log = LoggerFactory.getLogger(RecurringRuleAutoPostJob.class);

    private final RecurringRuleAutoPostService autoPostService;

    public RecurringRuleAutoPostJob(RecurringRuleAutoPostService autoPostService) {
        this.autoPostService = autoPostService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runOnStartup() {
        logAutoPosted(autoPostService.autoPostDueTransactions(), "startup");
    }

    @Scheduled(cron = "0 5 3 * * *")
    public void runDaily() {
        logAutoPosted(autoPostService.autoPostDueTransactions(), "scheduled");
    }

    private void logAutoPosted(int created, String source) {
        if (created > 0) {
            log.info("Auto-posted {} recurring transactions ({})", created, source);
        }
    }
}
