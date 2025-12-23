import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const revenueData = [
  { month: "Jan", receita: 12400, custo: 4200, lucro: 8200 },
  { month: "Fev", receita: 15800, custo: 5100, lucro: 10700 },
  { month: "Mar", receita: 18200, custo: 5800, lucro: 12400 },
  { month: "Abr", receita: 21000, custo: 6500, lucro: 14500 },
  { month: "Mai", receita: 24500, custo: 7200, lucro: 17300 },
  { month: "Jun", receita: 28800, custo: 8100, lucro: 20700 },
  { month: "Jul", receita: 32400, custo: 9000, lucro: 23400 },
  { month: "Ago", receita: 38200, custo: 10500, lucro: 27700 },
  { month: "Set", receita: 42800, custo: 11200, lucro: 31600 },
  { month: "Out", receita: 45230, custo: 12450, lucro: 32780 },
];

const productData = [
  { name: "Produto A", value: 35 },
  { name: "Produto B", value: 28 },
  { name: "Produto C", value: 22 },
  { name: "Produto D", value: 15 },
];

const COLORS = ["hsl(173, 80%, 40%)", "hsl(222, 47%, 25%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)"];

const RevenueChart = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">Evolução de Receita</h3>
          <p className="text-sm text-muted-foreground">Receita vs Custos vs Lucro</p>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(173, 80%, 40%)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="month" stroke="hsl(220, 9%, 46%)" fontSize={12} />
            <YAxis stroke="hsl(220, 9%, 46%)" fontSize={12} tickFormatter={(value) => `R$ ${value / 1000}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
              }}
              formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, ""]}
            />
            <Area type="monotone" dataKey="receita" stroke="hsl(173, 80%, 40%)" fillOpacity={1} fill="url(#colorReceita)" strokeWidth={2} name="Receita" />
            <Area type="monotone" dataKey="lucro" stroke="hsl(142, 76%, 36%)" fillOpacity={1} fill="url(#colorLucro)" strokeWidth={2} name="Lucro" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ProductChart = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">Vendas por Produto</h3>
          <p className="text-sm text-muted-foreground">Distribuição percentual</p>
        </div>
      </div>
      <div className="h-80 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={productData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {productData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`${value}%`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {productData.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-medium text-foreground ml-auto">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardCharts = () => {
  return (
    <div className="grid lg:grid-cols-3 gap-6 mt-6">
      <div className="lg:col-span-2">
        <RevenueChart />
      </div>
      <div>
        <ProductChart />
      </div>
    </div>
  );
};

export default DashboardCharts;
