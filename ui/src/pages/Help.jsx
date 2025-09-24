import { useState } from 'react';

const Help = () => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchTerm, setSearchTerm] = useState('');

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🚀',
      content: {
        title: 'Getting Started with RadiusForge',
        items: [
          {
            title: 'Quick Start Guide',
            content: `
              <h4>1. Configure Your Target</h4>
              <p>Navigate to Scale Test and configure your target system (Asset Manager or Cisco ISE):</p>
              <ul>
                <li>Enter the host/IP address</li>
                <li>Set the appropriate port (1812 for RADIUS Auth, 1813 for Accounting)</li>
                <li>Configure the shared secret</li>
              </ul>

              <h4>2. Select Traffic Profile</h4>
              <p>Choose your authentication type and traffic parameters:</p>
              <ul>
                <li>Traffic Type: RADIUS, TACACS+, or Syslog</li>
                <li>Auth Type: PAP, CHAP, EAP-TLS, PEAP, etc.</li>
                <li>RPS Profile: Constant, Step, Ramp, or Burst</li>
              </ul>

              <h4>3. Start Your Test</h4>
              <p>Click "Start Test" and monitor real-time KPIs including:</p>
              <ul>
                <li>Current RPS vs Target RPS</li>
                <li>Latency percentiles (p50, p95, p99)</li>
                <li>Success and error rates</li>
              </ul>
            `
          },
          {
            title: 'First Test Checklist',
            content: `
              <h4>Before Running Your First Test:</h4>
              <ul>
                <li>✓ Verify network connectivity to target system</li>
                <li>✓ Confirm shared secret is correct</li>
                <li>✓ Start with low RPS (150-500) for initial validation</li>
                <li>✓ Ensure target system can handle the planned load</li>
                <li>✓ Check firewall rules for RADIUS ports (1812/1813)</li>
                <li>✓ Verify NAD (Network Access Device) configuration</li>
              </ul>

              <h4>Recommended First Test:</h4>
              <ul>
                <li>Target: Your test Asset Manager instance</li>
                <li>Auth Type: PAP (simplest)</li>
                <li>RPS: 150 (lowest preset)</li>
                <li>Duration: 1-2 minutes</li>
                <li>Clients: 5-10</li>
              </ul>
            `
          }
        ]
      }
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: '🔧',
      content: {
        title: 'Common Issues & Solutions',
        items: [
          {
            title: 'RADIUS Error Codes',
            content: `
              <h4>Common RADIUS Response Codes:</h4>
              <table class="error-table">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Solution</th>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Access-Reject</td>
                  <td>Authentication failed</td>
                  <td>Check username/password, shared secret, or user database</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>Access-Challenge</td>
                  <td>Additional authentication required</td>
                  <td>Expected for EAP methods - part of normal flow</td>
                </tr>
                <tr>
                  <td>11</td>
                  <td>Access-Challenge (CoA)</td>
                  <td>Change of Authorization request</td>
                  <td>Verify CoA is enabled and configured correctly</td>
                </tr>
              </table>

              <h4>Timeout Issues:</h4>
              <ul>
                <li><strong>High timeout rate:</strong> Check network latency, target system load</li>
                <li><strong>Intermittent timeouts:</strong> May indicate target system overload</li>
                <li><strong>Consistent timeouts:</strong> Verify connectivity and shared secret</li>
              </ul>
            `
          },
          {
            title: 'TLS Configuration Issues',
            content: `
              <h4>EAP-TLS Common Problems:</h4>
              <ul>
                <li><strong>Certificate validation failed:</strong>
                  <ul>
                    <li>Verify CA certificate is trusted by target system</li>
                    <li>Check certificate chain completeness</li>
                    <li>Ensure certificates haven't expired</li>
                  </ul>
                </li>
                <li><strong>TLS handshake timeout:</strong>
                  <ul>
                    <li>Increase handshake timeout settings</li>
                    <li>Check for MTU/fragmentation issues</li>
                    <li>Verify TLS version compatibility</li>
                  </ul>
                </li>
                <li><strong>Fragment size issues:</strong>
                  <ul>
                    <li>Try reducing EAP fragment size (default: 1024)</li>
                    <li>Common values: 512, 768, 1024, 1400</li>
                  </ul>
                </li>
              </ul>

              <h4>Certificate Requirements:</h4>
              <ul>
                <li>Client certificates must include Extended Key Usage for Client Authentication</li>
                <li>Server certificates must be trusted by RadiusForge</li>
                <li>Certificate chain must be complete (no missing intermediate CAs)</li>
              </ul>
            `
          },
          {
            title: 'Performance Issues',
            content: `
              <h4>Low RPS / Can't Reach Target:</h4>
              <ul>
                <li><strong>Increase client count:</strong> More concurrent connections can improve throughput</li>
                <li><strong>Check target system capacity:</strong> Monitor CPU/memory on RADIUS server</li>
                <li><strong>Network bottlenecks:</strong> Verify bandwidth and latency</li>
                <li><strong>RadiusForge limits:</strong> Check system resources (CPU, memory, file descriptors)</li>
              </ul>

              <h4>High Latency:</h4>
              <ul>
                <li><strong>Network latency:</strong> Use ping/traceroute to measure baseline</li>
                <li><strong>Target processing time:</strong> Complex auth methods (EAP-TLS) take longer</li>
                <li><strong>Database performance:</strong> Check user database response times</li>
                <li><strong>Overload conditions:</strong> Reduce RPS to find optimal operating point</li>
              </ul>

              <h4>Optimization Tips:</h4>
              <ul>
                <li>Use connection pooling when available</li>
                <li>Distribute load across multiple RadiusForge instances</li>
                <li>Monitor target system metrics during tests</li>
                <li>Use appropriate auth methods for your use case</li>
              </ul>
            `
          }
        ]
      }
    },
    {
      id: 'capacity-planning',
      title: 'Capacity Planning',
      icon: '📊',
      content: {
        title: 'Capacity Planning Calculator',
        items: [
          {
            title: 'Resource Estimation',
            content: `
              <div class="calculator">
                <h4>RadiusForge Resource Calculator</h4>
                <div class="calc-grid">
                  <div class="calc-item">
                    <label>Target RPS:</label>
                    <input type="number" id="targetRps" value="5000" min="100" max="100000" />
                  </div>
                  <div class="calc-item">
                    <label>Auth Type:</label>
                    <select id="authType">
                      <option value="pap">PAP/CHAP</option>
                      <option value="eap-tls">EAP-TLS</option>
                      <option value="peap">PEAP</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                  <div class="calc-item">
                    <label>Test Duration (min):</label>
                    <input type="number" id="duration" value="10" min="1" max="120" />
                  </div>
                </div>
                
                <div class="calc-results" id="calcResults">
                  <h5>Estimated Requirements:</h5>
                  <ul>
                    <li>CPU Cores: <span id="cpuCores">4-8</span></li>
                    <li>Memory: <span id="memory">8-16 GB</span></li>
                    <li>Network: <span id="network">1 Gbps</span></li>
                    <li>Concurrent Sockets: <span id="sockets">100-200</span></li>
                    <li>File Descriptors: <span id="fileDesc">1024</span></li>
                  </ul>
                </div>
              </div>

              <h4>Scaling Guidelines:</h4>
              <ul>
                <li><strong>Single Instance Limits:</strong>
                  <ul>
                    <li>PAP/CHAP: ~50,000 RPS</li>
                    <li>EAP-TLS: ~10,000 RPS</li>
                    <li>PEAP: ~20,000 RPS</li>
                  </ul>
                </li>
                <li><strong>Horizontal Scaling:</strong>
                  <ul>
                    <li>Deploy multiple RadiusForge instances</li>
                    <li>Use load balancer for target distribution</li>
                    <li>Monitor each instance separately</li>
                  </ul>
                </li>
              </ul>
            `
          },
          {
            title: 'Target System Sizing',
            content: `
              <h4>Asset Manager Capacity Planning:</h4>
              <table class="capacity-table">
                <tr>
                  <th>Hardware Tier</th>
                  <th>CPU</th>
                  <th>Memory</th>
                  <th>Expected RPS</th>
                  <th>Concurrent Sessions</th>
                </tr>
                <tr>
                  <td>Small</td>
                  <td>4 cores</td>
                  <td>8 GB</td>
                  <td>1,000-2,000</td>
                  <td>5,000</td>
                </tr>
                <tr>
                  <td>Medium</td>
                  <td>8 cores</td>
                  <td>16 GB</td>
                  <td>3,000-5,000</td>
                  <td>15,000</td>
                </tr>
                <tr>
                  <td>Large</td>
                  <td>16 cores</td>
                  <td>32 GB</td>
                  <td>8,000-12,000</td>
                  <td>50,000</td>
                </tr>
                <tr>
                  <td>Enterprise</td>
                  <td>32+ cores</td>
                  <td>64+ GB</td>
                  <td>15,000+</td>
                  <td>100,000+</td>
                </tr>
              </table>

              <h4>Performance Factors:</h4>
              <ul>
                <li><strong>Authentication Method:</strong> EAP-TLS requires more CPU than PAP</li>
                <li><strong>Database Performance:</strong> User lookup time affects overall latency</li>
                <li><strong>Policy Complexity:</strong> Complex authorization rules add overhead</li>
                <li><strong>Logging Level:</strong> Detailed logging impacts performance</li>
              </ul>
            `
          }
        ]
      }
    },
    {
      id: 'protocols',
      title: 'Protocol Reference',
      icon: '📚',
      content: {
        title: 'AAA Protocol Reference',
        items: [
          {
            title: 'RADIUS Protocol',
            content: `
              <h4>RADIUS Message Types:</h4>
              <ul>
                <li><strong>Access-Request (1):</strong> Authentication request from NAS</li>
                <li><strong>Access-Accept (2):</strong> Authentication successful</li>
                <li><strong>Access-Reject (3):</strong> Authentication failed</li>
                <li><strong>Accounting-Request (4):</strong> Accounting information</li>
                <li><strong>Accounting-Response (5):</strong> Accounting acknowledgment</li>
                <li><strong>Access-Challenge (11):</strong> Additional authentication required</li>
                <li><strong>CoA-Request (43):</strong> Change of Authorization</li>
                <li><strong>Disconnect-Request (40):</strong> Disconnect user session</li>
              </ul>

              <h4>Common Attributes:</h4>
              <ul>
                <li><strong>User-Name (1):</strong> Username for authentication</li>
                <li><strong>User-Password (2):</strong> Password (PAP)</li>
                <li><strong>CHAP-Password (3):</strong> CHAP challenge/response</li>
                <li><strong>NAS-IP-Address (4):</strong> IP address of NAS</li>
                <li><strong>NAS-Port (5):</strong> Physical port on NAS</li>
                <li><strong>Service-Type (6):</strong> Type of service requested</li>
                <li><strong>Framed-Protocol (7):</strong> Framing protocol (PPP, SLIP)</li>
                <li><strong>Filter-ID (11):</strong> Access control list identifier</li>
                <li><strong>Session-Timeout (27):</strong> Maximum session duration</li>
                <li><strong>Calling-Station-Id (31):</strong> Phone number or MAC address</li>
              </ul>

              <h4>EAP Types Supported:</h4>
              <ul>
                <li><strong>EAP-MD5:</strong> Simple challenge/response (legacy)</li>
                <li><strong>EAP-TLS:</strong> Certificate-based authentication</li>
                <li><strong>PEAP:</strong> Protected EAP (tunneled)</li>
                <li><strong>EAP-TTLS:</strong> Tunneled TLS</li>
                <li><strong>EAP-FAST:</strong> Flexible Authentication via Secure Tunneling</li>
                <li><strong>EAP-MSCHAPv2:</strong> Microsoft CHAP version 2</li>
              </ul>
            `
          },
          {
            title: 'TACACS+ Protocol',
            content: `
              <h4>TACACS+ Packet Types:</h4>
              <ul>
                <li><strong>Authentication:</strong> Verify user credentials</li>
                <li><strong>Authorization:</strong> Determine what user can do</li>
                <li><strong>Accounting:</strong> Log what user did</li>
              </ul>

              <h4>Authentication Types:</h4>
              <ul>
                <li><strong>ASCII:</strong> Plain text username/password</li>
                <li><strong>PAP:</strong> Password Authentication Protocol</li>
                <li><strong>CHAP:</strong> Challenge Handshake Authentication Protocol</li>
                <li><strong>MSCHAP:</strong> Microsoft CHAP</li>
                <li><strong>MSCHAPv2:</strong> Microsoft CHAP version 2</li>
              </ul>

              <h4>Authorization Attributes:</h4>
              <ul>
                <li><strong>service:</strong> Type of service (shell, ppp, etc.)</li>
                <li><strong>protocol:</strong> Protocol used (ip, ipx, etc.)</li>
                <li><strong>cmd:</strong> Command to be executed</li>
                <li><strong>cmd-arg:</strong> Command arguments</li>
                <li><strong>priv-lvl:</strong> Privilege level (0-15)</li>
              </ul>

              <h4>Common Use Cases:</h4>
              <ul>
                <li>Network device management access</li>
                <li>Command authorization on routers/switches</li>
                <li>Privilege level enforcement</li>
                <li>Detailed command accounting</li>
              </ul>
            `
          },
          {
            title: 'Syslog Protocol',
            content: `
              <h4>Syslog Facilities:</h4>
              <ul>
                <li><strong>local0-local7:</strong> Local use facilities</li>
                <li><strong>auth:</strong> Security/authorization messages</li>
                <li><strong>authpriv:</strong> Security/authorization messages (private)</li>
                <li><strong>daemon:</strong> System daemons</li>
                <li><strong>kern:</strong> Kernel messages</li>
                <li><strong>mail:</strong> Mail system</li>
                <li><strong>user:</strong> Generic user-level messages</li>
              </ul>

              <h4>Severity Levels:</h4>
              <ul>
                <li><strong>0 - Emergency:</strong> System is unusable</li>
                <li><strong>1 - Alert:</strong> Action must be taken immediately</li>
                <li><strong>2 - Critical:</strong> Critical conditions</li>
                <li><strong>3 - Error:</strong> Error conditions</li>
                <li><strong>4 - Warning:</strong> Warning conditions</li>
                <li><strong>5 - Notice:</strong> Normal but significant condition</li>
                <li><strong>6 - Info:</strong> Informational messages</li>
                <li><strong>7 - Debug:</strong> Debug-level messages</li>
              </ul>

              <h4>Message Format:</h4>
              <pre>&lt;priority&gt;timestamp hostname tag: message</pre>
              <p>Priority = Facility * 8 + Severity</p>
            `
          }
        ]
      }
    },
    {
      id: 'glossary',
      title: 'Glossary',
      icon: '📖',
      content: {
        title: 'AAA Terms & Definitions',
        items: [
          {
            title: 'Authentication Terms',
            content: `
              <dl class="glossary">
                <dt>AAA</dt>
                <dd>Authentication, Authorization, and Accounting - the three pillars of network security</dd>
                
                <dt>RADIUS</dt>
                <dd>Remote Authentication Dial-In User Service - protocol for AAA</dd>
                
                <dt>TACACS+</dt>
                <dd>Terminal Access Controller Access-Control System Plus - Cisco's AAA protocol</dd>
                
                <dt>NAS</dt>
                <dd>Network Access Server - device that provides access to a network (switch, wireless controller, VPN concentrator)</dd>
                
                <dt>Supplicant</dt>
                <dd>Client device requesting network access (laptop, phone, IoT device)</dd>
                
                <dt>Authenticator</dt>
                <dd>Network device that controls access (typically the NAS)</dd>
                
                <dt>Authentication Server</dt>
                <dd>Server that validates credentials (Asset Manager, Cisco ISE, FreeRADIUS)</dd>
                
                <dt>Shared Secret</dt>
                <dd>Pre-shared key used to secure communication between NAS and RADIUS server</dd>
                
                <dt>EAP</dt>
                <dd>Extensible Authentication Protocol - framework for various authentication methods</dd>
                
                <dt>802.1X</dt>
                <dd>IEEE standard for port-based network access control</dd>
              </dl>
            `
          },
          {
            title: 'Performance Terms',
            content: `
              <dl class="glossary">
                <dt>RPS</dt>
                <dd>Requests Per Second - rate of authentication requests</dd>
                
                <dt>TPS</dt>
                <dd>Transactions Per Second - includes both authentication and accounting</dd>
                
                <dt>Latency</dt>
                <dd>Time between sending request and receiving response</dd>
                
                <dt>p50, p95, p99</dt>
                <dd>Percentile latencies - 50%, 95%, and 99% of requests complete within this time</dd>
                
                <dt>Throughput</dt>
                <dd>Amount of work completed in a given time period</dd>
                
                <dt>Concurrent Sessions</dt>
                <dd>Number of active user sessions at the same time</dd>
                
                <dt>Session Timeout</dt>
                <dd>Maximum duration a user session can remain active</dd>
                
                <dt>Reauthentication</dt>
                <dd>Process of periodically re-validating user credentials</dd>
                
                <dt>CoA</dt>
                <dd>Change of Authorization - dynamic policy updates for active sessions</dd>
                
                <dt>Disconnect Message</dt>
                <dd>Request to immediately terminate a user session</dd>
              </dl>
            `
          },
          {
            title: 'Testing Terms',
            content: `
              <dl class="glossary">
                <dt>Load Testing</dt>
                <dd>Testing system behavior under expected load conditions</dd>
                
                <dt>Stress Testing</dt>
                <dd>Testing system behavior under extreme load conditions</dd>
                
                <dt>Burst Testing</dt>
                <dd>Testing system response to sudden traffic spikes</dd>
                
                <dt>Sustained Load</dt>
                <dd>Continuous traffic at a specific rate for extended duration</dd>
                
                <dt>Ramp Testing</dt>
                <dd>Gradually increasing load to find performance limits</dd>
                
                <dt>SLO</dt>
                <dd>Service Level Objective - target performance metrics</dd>
                
                <dt>SLA</dt>
                <dd>Service Level Agreement - contractual performance commitments</dd>
                
                <dt>Baseline</dt>
                <dd>Reference performance measurements for comparison</dd>
                
                <dt>Regression Testing</dt>
                <dd>Comparing current performance against historical baselines</dd>
                
                <dt>Synthetic Load</dt>
                <dd>Artificially generated traffic that simulates real user behavior</dd>
              </dl>
            `
          }
        ]
      }
    }
  ];

  const filteredSections = sections.filter(section => {
    if (!searchTerm) return true;
    
    return section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           section.content.items.some(item => 
             item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             item.content.toLowerCase().includes(searchTerm.toLowerCase())
           );
  });

  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
  };

  const currentSection = sections.find(s => s.id === activeSection);

  return (
    <div className="help-page">
      <div className="page-header">
        <h1>Help & Documentation</h1>
        <p>Getting started guides, troubleshooting, and comprehensive AAA protocol reference</p>
      </div>

      <div className="help-search">
        <input 
          type="text"
          placeholder="Search documentation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="help-container">
        <div className="help-sidebar">
          <nav className="help-nav">
            {filteredSections.map(section => (
              <button
                key={section.id}
                className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => handleSectionClick(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-title">{section.title}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="help-content">
          {currentSection && (
            <>
              <div className="content-header">
                <h2>
                  <span className="section-icon">{currentSection.icon}</span>
                  {currentSection.content.title}
                </h2>
              </div>

              <div className="content-sections">
                {currentSection.content.items.map((item, index) => (
                  <div key={index} className="content-section">
                    <h3>{item.title}</h3>
                    <div 
                      className="content-body"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .help-page {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          color: #333;
          margin-bottom: 10px;
        }

        .help-search {
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          max-width: 400px;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }

        .help-container {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 30px;
          min-height: 600px;
        }

        .help-sidebar {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px 0;
          position: sticky;
          top: 20px;
          height: fit-content;
        }

        .help-nav {
          display: flex;
          flex-direction: column;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }

        .nav-item:hover {
          background-color: #e9ecef;
        }

        .nav-item.active {
          background-color: #007bff;
          color: white;
          border-left-color: #0056b3;
        }

        .nav-icon {
          font-size: 18px;
        }

        .nav-title {
          font-weight: 500;
          font-size: 14px;
        }

        .help-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .content-header {
          background: #f8f9fa;
          padding: 20px 30px;
          border-bottom: 1px solid #e0e0e0;
        }

        .content-header h2 {
          margin: 0;
          color: #333;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-icon {
          font-size: 24px;
        }

        .content-sections {
          padding: 30px;
        }

        .content-section {
          margin-bottom: 40px;
        }

        .content-section:last-child {
          margin-bottom: 0;
        }

        .content-section h3 {
          color: #555;
          margin-bottom: 20px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e9ecef;
        }

        .content-body {
          line-height: 1.6;
        }

        .content-body h4 {
          color: #666;
          margin: 20px 0 10px 0;
          font-size: 16px;
        }

        .content-body h5 {
          color: #777;
          margin: 15px 0 8px 0;
          font-size: 14px;
        }

        .content-body ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .content-body li {
          margin-bottom: 8px;
        }

        .content-body strong {
          color: #333;
        }

        .error-table,
        .capacity-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          background: white;
          border: 1px solid #ddd;
        }

        .error-table th,
        .error-table td,
        .capacity-table th,
        .capacity-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        .error-table th,
        .capacity-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #555;
        }

        .calculator {
          background: #f0f8ff;
          padding: 20px;
          border-radius: 8px;
          margin: 15px 0;
          border: 1px solid #cce7ff;
        }

        .calc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .calc-item {
          display: flex;
          flex-direction: column;
        }

        .calc-item label {
          margin-bottom: 5px;
          font-weight: 500;
          color: #555;
        }

        .calc-item input,
        .calc-item select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .calc-results {
          background: white;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .calc-results h5 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .calc-results ul {
          margin: 0;
          padding-left: 20px;
        }

        .calc-results li {
          margin-bottom: 5px;
        }

        .glossary {
          margin: 15px 0;
        }

        .glossary dt {
          font-weight: 600;
          color: #333;
          margin: 15px 0 5px 0;
        }

        .glossary dt:first-child {
          margin-top: 0;
        }

        .glossary dd {
          margin: 0 0 10px 20px;
          color: #666;
          line-height: 1.5;
        }

        pre {
          background: #f4f4f4;
          padding: 10px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          overflow-x: auto;
        }

        @media (max-width: 768px) {
          .help-container {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .help-sidebar {
            position: static;
          }

          .help-nav {
            flex-direction: row;
            overflow-x: auto;
            gap: 10px;
          }

          .nav-item {
            white-space: nowrap;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default Help;