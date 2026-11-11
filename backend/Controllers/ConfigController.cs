using Microsoft.AspNetCore.Mvc;

namespace TicketCompass.Api.Controllers;

[ApiController]
[Route("api/config")]
public class ConfigController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public ConfigController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet("model")]
    public IActionResult GetModel()
    {
        var model = _configuration["LLM_PROVIDER"] ?? "Unknown";

        return Ok(new { model });
    }
}