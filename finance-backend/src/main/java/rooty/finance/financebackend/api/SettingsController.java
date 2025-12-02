package rooty.finance.financebackend.api;

import org.springframework.web.bind.annotation.*;
import rooty.finance.financebackend.api.dto.AppSettingsDto;
import rooty.finance.financebackend.domain.AppSettings;
import rooty.finance.financebackend.domain.AppSettingsRepository;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final AppSettingsRepository appSettingsRepository;

    public SettingsController(AppSettingsRepository appSettingsRepository) {
        this.appSettingsRepository = appSettingsRepository;
    }

    @GetMapping
    public AppSettingsDto get() {
        AppSettings settings = appSettingsRepository.findById(1L).orElseGet(() -> appSettingsRepository.save(
                AppSettings.builder().id(1L).currencyCode("EUR").firstDayOfMonth(1).firstDayOfWeek(1).build()));
        return DtoMapper.toDto(settings);
    }

    @PutMapping
    public AppSettingsDto update(@RequestBody AppSettingsDto dto) {
        AppSettings settings = appSettingsRepository.findById(1L).orElseGet(() -> AppSettings.builder().id(1L).build());
        DtoMapper.updateAppSettings(settings, dto);
        settings.setId(1L);
        return DtoMapper.toDto(appSettingsRepository.save(settings));
    }
}
