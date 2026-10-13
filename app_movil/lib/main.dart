import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:url_launcher/url_launcher.dart';
import 'package:fl_chart/fl_chart.dart';

void main() {
  runApp(const GastoSmartApp());
}

class Api {
  static String get baseUrl {
    // Para dispositivos físicos en la misma red WiFi, usar la IP local de la PC.
    return 'http://192.168.100.51/a_sistente/gastos_smart';
  }

  static String cookie = '';

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth.php?action=login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (response.headers['set-cookie'] != null) {
      cookie = response.headers['set-cookie']!;
    }
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getDashboard() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/expenses.php'),
      headers: {'Cookie': cookie},
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getHistory(String period) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/expenses.php?action=history&period=$period'),
      headers: {'Cookie': cookie},
    );
    return jsonDecode(response.body);
  }

  static String getExportUrl(String period) {
    return '$baseUrl/api/expenses.php?action=export&period=$period';
  }
}

class GastoSmartApp extends StatelessWidget {
  const GastoSmartApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GastoSmart',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF10B981),
          primary: const Color(0xFF10B981),
          secondary: const Color(0xFF0F172A),
        ),
        useMaterial3: true,
        fontFamily: 'Inter',
      ),
      home: const OnboardingScreen(),
    );
  }
}

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  image: const DecorationImage(
                    image: AssetImage('assets/logo.png'),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'GastoSmart',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              const Text('Tu dinero, mejor en control', style: TextStyle(fontSize: 16, color: Colors.grey)),
              const SizedBox(height: 48),
              const Text('Organiza tus gastos, ahorra\ny alcanza tus metas.', textAlign: TextAlign.center, style: TextStyle(fontSize: 16, color: Colors.black87)),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const LoginScreen()));
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('Comenzar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final emailController = TextEditingController(text: 'admin@gastos.com');
  final pwdController = TextEditingController(text: '123456');
  bool isLoading = false;

  void _login() async {
    setState(() => isLoading = true);
    try {
      final res = await Api.login(emailController.text, pwdController.text);
      if (res['success'] == true) {
        if (!mounted) return;
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const DashboardScreen()));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? 'Error')));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error de conexión: \$e')));
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Iniciar Sesión', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            const SizedBox(height: 32),
            TextField(
              controller: emailController,
              decoration: InputDecoration(
                labelText: 'Correo Electrónico',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: pwdController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Contraseña',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: isLoading ? null : _login,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Entrar', style: TextStyle(fontSize: 18, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? data;
  bool isLoading = true;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      final res = await Api.getDashboard();
      setState(() {
        data = res;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final total = data?['gastos']?['total'] ?? '0.00';
    final expensesList = data?['gastos']?['detalles'] ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.account_balance_wallet, color: Color(0xFF10B981)),
            SizedBox(width: 8),
            Text('GastoSmart', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.person_outline, color: Color(0xFF0F172A)), onPressed: () {})
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        selectedItemColor: const Color(0xFF10B981),
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Inicio'),
          BottomNavigationBarItem(icon: Icon(Icons.pie_chart), label: 'Gráficos'),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'Historial'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Perfil'),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: const Color(0xFF10B981),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildBody() {
    switch (_currentIndex) {
      case 0:
        return _buildHome();
      case 1:
        return const Center(child: Text('Gráficos detallados próximamente...'));
      case 2:
        return _buildHistory();
      default:
        return const Center(child: Text('En construcción'));
    }
  }

  Widget _buildHome() {
    final total = data?['total'] ?? 0.0;
    final expensesList = data?['recent'] ?? [];
    final chartData = data?['chart'] ?? {'labels': [], 'data': [], 'colors': []};
    final labels = chartData['labels'] as List;
    final amounts = chartData['data'] as List;
    final colors = chartData['colors'] as List;

    List<PieChartSectionData> showingSections() {
      if (amounts.isEmpty) {
        return [
          PieChartSectionData(
            color: Colors.grey.shade200,
            value: 100,
            title: '',
            radius: 20,
          )
        ];
      }
      return List.generate(amounts.length, (i) {
        final amount = (amounts[i] is int) ? (amounts[i] as int).toDouble() : (amounts[i] as double);
        String hexColor = colors[i].toString().replaceAll('#', '0xFF');
        return PieChartSectionData(
          color: Color(int.parse(hexColor)),
          value: amount,
          title: '',
          radius: 20,
        );
      });
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Text('Esta Semana', style: TextStyle(color: Colors.white70, fontSize: 16)),
                const SizedBox(height: 8),
                Text('\$${total.toStringAsFixed(2)} USD', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text('GASTADO', style: TextStyle(color: Colors.white54, fontSize: 12, letterSpacing: 1.2)),
                const SizedBox(height: 24),
                SizedBox(
                  height: 160,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      PieChart(
                        PieChartData(
                          sectionsSpace: 0,
                          centerSpaceRadius: 60,
                          sections: showingSections(),
                        ),
                      ),
                      // Legend in corners or around could be complex, keeping simple inside
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (labels.isNotEmpty)
                  Wrap(
                    spacing: 16,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: List.generate(labels.length, (index) {
                      String hexColor = colors[index].toString().replaceAll('#', '0xFF');
                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(width: 10, height: 10, decoration: BoxDecoration(color: Color(int.parse(hexColor)), shape: BoxShape.circle)),
                          const SizedBox(width: 4),
                          Text('${labels[index]}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        ],
                      );
                    }),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Gastos Recientes', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 16),
          ...expensesList.map<Widget>((e) {
            String hexColor = e['color'].toString().replaceAll('#', '0xFF');
            return _buildExpenseItem(
              Icons.receipt, 
              e['descripcion'] ?? 'Gasto', 
              e['fecha'] ?? '', 
              '-\$${e['monto']}', 
              Color(int.parse(hexColor))
            );
          }).toList(),
        ],
      ),
    );
  }



  Widget _buildHistory() {
    return const HistoryScreen();
  }


  Widget _buildExpenseItem(IconData icon, String title, String date, String amount, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text(date, style: const TextStyle(color: Colors.grey, fontSize: 14)),
              ],
            ),
          ),
          Text(amount, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.redAccent)),
        ],
      ),
    );
  }
}

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String period = 'mes';
  List<dynamic> historyList = [];
  double total = 0.0;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => isLoading = true);
    try {
      final res = await Api.getHistory(period);
      setState(() {
        historyList = res['history'] ?? [];
        total = (res['total'] ?? 0).toDouble();
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  Future<void> _exportCsv() async {
    final url = Uri.parse(Api.getExportUrl(period));
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo abrir el enlace.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              DropdownButton<String>(
                value: period,
                items: const [
                  DropdownMenuItem(value: 'todos', child: Text('Todos')),
                  DropdownMenuItem(value: 'mes', child: Text('Este Mes')),
                  DropdownMenuItem(value: 'quincena', child: Text('Últimos 15 días')),
                  DropdownMenuItem(value: 'semana', child: Text('Esta Semana')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setState(() => period = val);
                    _fetchHistory();
                  }
                },
              ),
              ElevatedButton.icon(
                onPressed: _exportCsv,
                icon: const Icon(Icons.download, size: 18),
                label: const Text('Exportar'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text('Total: \$${total.toStringAsFixed(2)} USD', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : historyList.isEmpty
                    ? const Center(child: Text('No hay gastos en este periodo.'))
                    : ListView.builder(
                        itemCount: historyList.length,
                        itemBuilder: (ctx, i) {
                          final item = historyList[i];
                          return ListTile(
                            leading: const CircleAvatar(child: Icon(Icons.receipt)),
                            title: Text(item['descripcion']),
                            subtitle: Text(item['categoria_nombre'] + ' - ' + item['fecha']),
                            trailing: Text('-\$${item['monto']}', style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
