# SIRFA Agent Finance - Alibaba Cloud Deployment Script (PowerShell)
# This script automates the deployment process to Alibaba Cloud ECS (Windows)

param(
    [string]$Action = "full",
    [string]$DomainName = "",
    [switch]$SkipSSL = $false
)

# Configuration
$AppName = "sirfa-agent-finance"
$AppDir = "C:\inetpub\$AppName"
$IISAppPool = $AppName
$IISSiteName = $AppName
$BackendPort = 3001

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Cyan"
}

# Functions
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "Error" { $Colors.Red }
        "Success" { $Colors.Green }
        "Warning" { $Colors.Yellow }
        "Info" { $Colors.Blue }
        default { "White" }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-Prerequisites {
    Write-Log "Installing prerequisites..." "Info"
    
    # Check if running as administrator
    if (-not (Test-Administrator)) {
        Write-Log "This script must be run as Administrator" "Error"
        exit 1
    }
    
    # Install Chocolatey if not present
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Log "Installing Chocolatey..." "Info"
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    # Install Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Log "Installing Node.js..." "Info"
        choco install nodejs -y
        refreshenv
    }
    
    # Install PM2
    if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
        Write-Log "Installing PM2..." "Info"
        npm install -g pm2
        npm install -g pm2-windows-service
    }
    
    # Install Git
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Log "Installing Git..." "Info"
        choco install git -y
        refreshenv
    }
    
    # Enable IIS and required features
    Write-Log "Enabling IIS features..." "Info"
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpLogging, IIS-RequestFiltering, IIS-StaticContent, IIS-DefaultDocument, IIS-DirectoryBrowsing -All
    
    # Install URL Rewrite Module
    $urlRewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
    $urlRewritePath = "$env:TEMP\urlrewrite.msi"
    
    if (-not (Get-Module -ListAvailable -Name WebAdministration)) {
        Import-Module WebAdministration
    }
    
    try {
        Get-WebGlobalModule -Name "URL Rewrite" -ErrorAction Stop
        Write-Log "URL Rewrite module already installed" "Info"
    }
    catch {
        Write-Log "Installing URL Rewrite module..." "Info"
        Invoke-WebRequest -Uri $urlRewriteUrl -OutFile $urlRewritePath
        Start-Process msiexec.exe -Wait -ArgumentList "/i $urlRewritePath /quiet"
        Remove-Item $urlRewritePath -Force
    }
    
    Write-Log "Prerequisites installed successfully" "Success"
}

function Setup-Application {
    Write-Log "Setting up application..." "Info"
    
    # Create application directory
    if (-not (Test-Path $AppDir)) {
        New-Item -ItemType Directory -Path $AppDir -Force
    }
    
    Set-Location $AppDir
    
    # Clone or update repository
    if (Test-Path ".git") {
        Write-Log "Updating existing repository..." "Info"
        git pull origin main
    }
    else {
        Write-Log "Repository not found. Please clone your repository to $AppDir" "Warning"
        Write-Log "Example: git clone https://github.com/your-username/sirfa-agent-finance.git $AppDir" "Info"
        Read-Host "Press Enter after cloning the repository"
    }
    
    # Install backend dependencies
    Write-Log "Installing backend dependencies..." "Info"
    Set-Location "$AppDir\backend"
    npm install --production
    
    # Install frontend dependencies and build
    Write-Log "Building frontend..." "Info"
    Set-Location "$AppDir\frontend"
    npm install
    npm run build
    
    Write-Log "Application setup completed" "Success"
}

function Configure-Environment {
    Write-Log "Configuring environment..." "Info"
    
    $envPath = "$AppDir\backend\.env"
    
    if (-not (Test-Path $envPath)) {
        Write-Log ".env file not found. Creating from template..." "Warning"
        
        $envTemplate = @"
# Alibaba Cloud PAI Configuration
PAI_EAS_SERVICE_URL=your_pai_eas_service_url_here
PAI_EAS_SERVICE_TOKEN=your_pai_eas_service_token_here
PAI_MODEL_NAME=qwen-plus
PAI_TIMEOUT=30000
ALIBABA_REGION=us-east-1

# Fallback QWEN API (optional)
QWEN_API_KEY=your_qwen_api_key_here

# Alpaca Trading API
ALPACA_API_KEY=your_alpaca_api_key_here
ALPACA_SECRET_KEY=your_alpaca_secret_key_here
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Application Configuration
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Database (if using)
# DATABASE_URL=your_database_url_here

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Logging
LOG_LEVEL=info
"@
        
        Set-Content -Path $envPath -Value $envTemplate
        
        Write-Log "Please edit $envPath with your actual credentials:" "Warning"
        Write-Log "- PAI_EAS_SERVICE_URL" "Warning"
        Write-Log "- PAI_EAS_SERVICE_TOKEN" "Warning"
        Write-Log "- ALPACA_API_KEY" "Warning"
        Write-Log "- ALPACA_SECRET_KEY" "Warning"
        
        Read-Host "Press Enter after updating the .env file"
    }
    
    Write-Log "Environment configuration completed" "Success"
}

function Setup-PM2Service {
    Write-Log "Setting up PM2 service..." "Info"
    
    Set-Location $AppDir
    
    # Create PM2 ecosystem file
    $pm2Config = @"
module.exports = {
  apps: [
    {
      name: 'sirfa-backend',
      script: './server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: $BackendPort
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      restart_delay: 4000,
      max_restarts: 10
    }
  ]
};
"@
    
    Set-Content -Path "$AppDir\ecosystem.config.js" -Value $pm2Config
    
    # Create logs directory
    if (-not (Test-Path "$AppDir\logs")) {
        New-Item -ItemType Directory -Path "$AppDir\logs" -Force
    }
    
    # Stop existing processes
    try {
        pm2 delete all
    }
    catch {
        Write-Log "No existing PM2 processes to stop" "Info"
    }
    
    # Start application
    pm2 start "$AppDir\ecosystem.config.js"
    
    # Save PM2 configuration
    pm2 save
    
    # Install PM2 as Windows service
    try {
        pm2-service-install -n "SIRFA-Agent-Finance"
        pm2-service-start
    }
    catch {
        Write-Log "PM2 service installation failed, but application is running" "Warning"
    }
    
    Write-Log "PM2 service setup completed" "Success"
}

function Setup-IIS {
    Write-Log "Setting up IIS..." "Info"
    
    Import-Module WebAdministration
    
    # Remove default website
    try {
        Remove-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
    }
    catch {
        Write-Log "Default website already removed or doesn't exist" "Info"
    }
    
    # Create application pool
    if (Get-WebAppPool -Name $IISAppPool -ErrorAction SilentlyContinue) {
        Remove-WebAppPool -Name $IISAppPool
    }
    
    New-WebAppPool -Name $IISAppPool
    Set-ItemProperty -Path "IIS:\AppPools\$IISAppPool" -Name processModel.identityType -Value ApplicationPoolIdentity
    Set-ItemProperty -Path "IIS:\AppPools\$IISAppPool" -Name recycling.periodicRestart.time -Value "00:00:00"
    
    # Create website
    if (Get-Website -Name $IISSiteName -ErrorAction SilentlyContinue) {
        Remove-Website -Name $IISSiteName
    }
    
    $sitePath = "$AppDir\frontend\dist"
    New-Website -Name $IISSiteName -ApplicationPool $IISAppPool -PhysicalPath $sitePath -Port 80
    
    # Create web.config for React SPA
    $webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Handle Angular/React Router -->
        <rule name="Angular/React Router" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
        
        <!-- Proxy API requests to Node.js backend -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:$BackendPort/api/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    
    <!-- Security headers -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="Referrer-Policy" value="no-referrer-when-downgrade" />
      </customHeaders>
    </httpProtocol>
    
    <!-- Compression -->
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />
    
    <!-- Static file caching -->
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
    </staticContent>
  </system.webServer>
</configuration>
"@
    
    Set-Content -Path "$sitePath\web.config" -Value $webConfig
    
    # Start website
    Start-Website -Name $IISSiteName
    
    Write-Log "IIS setup completed" "Success"
}

function Setup-SSL {
    if ($SkipSSL -or [string]::IsNullOrEmpty($DomainName)) {
        Write-Log "Skipping SSL setup" "Info"
        return
    }
    
    Write-Log "Setting up SSL certificate for $DomainName..." "Info"
    
    # Install win-acme (Let's Encrypt client for Windows)
    $winAcmeUrl = "https://github.com/win-acme/win-acme/releases/latest/download/win-acme.v2.2.0.1431.x64.pluggable.zip"
    $winAcmePath = "C:\tools\win-acme"
    
    if (-not (Test-Path $winAcmePath)) {
        Write-Log "Installing win-acme..." "Info"
        New-Item -ItemType Directory -Path $winAcmePath -Force
        
        $zipPath = "$env:TEMP\win-acme.zip"
        Invoke-WebRequest -Uri $winAcmeUrl -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath $winAcmePath -Force
        Remove-Item $zipPath -Force
    }
    
    # Request SSL certificate
    Write-Log "Requesting SSL certificate for $DomainName..." "Info"
    & "$winAcmePath\wacs.exe" --target iis --siteid 1 --accepttos --emailaddress "admin@$DomainName" --unattended
    
    Write-Log "SSL certificate setup completed" "Success"
}

function Setup-Firewall {
    Write-Log "Configuring Windows Firewall..." "Info"
    
    # Allow HTTP
    New-NetFirewallRule -DisplayName "SIRFA HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -ErrorAction SilentlyContinue
    
    # Allow HTTPS
    New-NetFirewallRule -DisplayName "SIRFA HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction SilentlyContinue
    
    # Allow backend port (for development/debugging)
    New-NetFirewallRule -DisplayName "SIRFA Backend" -Direction Inbound -Protocol TCP -LocalPort $BackendPort -Action Allow -ErrorAction SilentlyContinue
    
    Write-Log "Firewall configured" "Success"
}

function Test-Deployment {
    Write-Log "Running deployment tests..." "Info"
    
    # Wait for services to start
    Start-Sleep -Seconds 10
    
    # Test backend health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health/system" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Log "Backend health check passed" "Success"
        }
        else {
            Write-Log "Backend health check failed" "Error"
            return $false
        }
    }
    catch {
        Write-Log "Backend health check failed: $($_.Exception.Message)" "Error"
        return $false
    }
    
    # Test PAI integration
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health/pai" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Log "PAI integration test passed" "Success"
        }
        else {
            Write-Log "PAI integration test failed (check credentials)" "Warning"
        }
    }
    catch {
        Write-Log "PAI integration test failed: $($_.Exception.Message)" "Warning"
    }
    
    # Test IIS
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Log "IIS health check passed" "Success"
        }
        else {
            Write-Log "IIS health check failed" "Error"
            return $false
        }
    }
    catch {
        Write-Log "IIS health check failed: $($_.Exception.Message)" "Error"
        return $false
    }
    
    Write-Log "All tests passed" "Success"
    return $true
}

function Show-Status {
    Write-Log "Deployment Status:" "Info"
    Write-Host ""
    Write-Host "Application Directory: $AppDir"
    Write-Host "PM2 Status:"
    pm2 status
    Write-Host ""
    Write-Host "IIS Status:"
    Get-Website | Format-Table Name, State, PhysicalPath, Bindings
    Write-Host ""
    Write-Host "Application URLs:"
    
    if (-not [string]::IsNullOrEmpty($DomainName)) {
        Write-Host "  Frontend: https://$DomainName"
        Write-Host "  API: https://$DomainName/api/health/system"
    }
    else {
        $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" } | Select-Object -First 1).IPAddress
        Write-Host "  Frontend: http://$localIP"
        Write-Host "  API: http://$localIP/api/health/system"
    }
    
    Write-Host ""
    Write-Log "🎉 SIRFA Agent Finance deployed successfully!" "Success"
}

# Main deployment function
function Start-Deployment {
    Write-Log "Starting SIRFA Agent Finance deployment to Alibaba Cloud (Windows)..." "Info"
    
    Install-Prerequisites
    Setup-Application
    Configure-Environment
    Setup-PM2Service
    Setup-IIS
    Setup-SSL
    Setup-Firewall
    
    if (Test-Deployment) {
        Show-Status
        
        Write-Log "Don't forget to:" "Info"
        Write-Log "1. Configure your PAI EAS credentials in $AppDir\backend\.env" "Info"
        Write-Log "2. Set up monitoring and alerts" "Info"
        Write-Log "3. Configure backup strategies" "Info"
        Write-Log "4. Review security settings" "Info"
    }
    else {
        Write-Log "Deployment completed with errors. Please check the logs." "Warning"
    }
}

# Handle script parameters
switch ($Action.ToLower()) {
    "install-deps" {
        Install-Prerequisites
    }
    "setup-app" {
        Setup-Application
    }
    "setup-iis" {
        Setup-IIS
    }
    "setup-ssl" {
        Setup-SSL
    }
    "test" {
        Test-Deployment
    }
    "status" {
        Show-Status
    }
    "full" {
        Start-Deployment
    }
    default {
        Write-Host "Usage: .\deploy-alibaba-cloud.ps1 [-Action <action>] [-DomainName <domain>] [-SkipSSL]"
        Write-Host "Actions:"
        Write-Host "  install-deps: Install system dependencies only"
        Write-Host "  setup-app: Setup application only"
        Write-Host "  setup-iis: Setup IIS only"
        Write-Host "  setup-ssl: Setup SSL only"
        Write-Host "  test: Run deployment tests"
        Write-Host "  status: Show deployment status"
        Write-Host "  full: Run full deployment (default)"
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\deploy-alibaba-cloud.ps1"
        Write-Host "  .\deploy-alibaba-cloud.ps1 -Action full -DomainName 'sirfa.example.com'"
        Write-Host "  .\deploy-alibaba-cloud.ps1 -Action test"
        exit 1
    }
}