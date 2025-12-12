package rooty.finance.financebackend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SchemaUpdater {

    private static final Logger log = LoggerFactory.getLogger(SchemaUpdater.class);

    private final JdbcTemplate jdbcTemplate;

    public SchemaUpdater(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureRecurringRuleNoteColumn() {
        try {
            jdbcTemplate.execute("ALTER TABLE IF EXISTS recurring_rule ADD COLUMN IF NOT EXISTS note VARCHAR(500)");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS recurring_rule ADD COLUMN IF NOT EXISTS note_text VARCHAR(500)");
            jdbcTemplate.execute("UPDATE recurring_rule SET note = note_text WHERE note IS NULL AND note_text IS NOT NULL");
        } catch (Exception ex) {
            log.warn("Could not ensure recurring_rule note columns: {}", ex.getMessage());
        }
    }
}
