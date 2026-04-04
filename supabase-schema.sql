-- ============================================
-- SCHEMA SUPABASE - Caixa Ulli
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Tabela de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client TEXT NOT NULL,
  passengers INT NOT NULL DEFAULT 1,
  package TEXT NOT NULL,
  total_value NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  sale_date DATE NOT NULL,
  tour_date DATE NOT NULL,
  reservation_payment NUMERIC(12,2) DEFAULT 0,
  remaining_value NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'Pix',
  installments INT DEFAULT 1,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'ativo',
  notes TEXT,
  seller_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de custos de venda
CREATE TABLE IF NOT EXISTS sale_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de registros financeiros
CREATE TABLE IF NOT EXISTS financial_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Pix',
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  category_id UUID REFERENCES categories(id),
  transaction_date DATE NOT NULL,
  due_date DATE,
  payment_date DATE,
  status TEXT DEFAULT 'previsto',
  description TEXT,
  notes TEXT,
  reference TEXT,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  installment_number INT,
  total_installments INT,
  receipt_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configuracoes do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT
);

-- Tabela de metodos de pagamento
CREATE TABLE IF NOT EXISTS payment_method_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  default_rate NUMERIC(5,2) DEFAULT 0
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_status ON financial_records(status);
CREATE INDEX IF NOT EXISTS idx_financial_records_sale_id ON financial_records(sale_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_transaction_date ON financial_records(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_records_due_date ON financial_records(due_date);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_costs_sale_id ON sale_costs(sale_id);

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_records_updated_at ON financial_records;
CREATE TRIGGER update_financial_records_updated_at BEFORE UPDATE ON financial_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Desabilitar RLS para acesso via service role
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_config ENABLE ROW LEVEL SECURITY;

-- Politicas para acesso via service_role (backend)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON sale_costs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON financial_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON system_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON payment_method_config FOR ALL USING (true) WITH CHECK (true);

-- Dados iniciais: usuario admin
INSERT INTO users (email, name, password_hash, role)
VALUES ('admin@caixaulli.com', 'Administrador', '$2b$10$tXKrzLQtFG6z/Z90MCVkveFBliWvnCgDfeOWGTAmlh3YKL20i9BQ2', 'admin')
ON CONFLICT (email) DO NOTHING;
-- Senha: admin123

-- Dados iniciais: categorias
INSERT INTO categories (name, type) VALUES
  ('Receita de Vendas', 'entrada'),
  ('Receita de Servicos', 'entrada'),
  ('Outras Receitas', 'entrada'),
  ('Custos Operacionais', 'saida'),
  ('Despesas Administrativas', 'saida'),
  ('Marketing e Publicidade', 'saida'),
  ('Salarios e Beneficios', 'saida'),
  ('Impostos e Taxas', 'saida'),
  ('Aluguel e Infraestrutura', 'saida'),
  ('Viagens e Deslocamentos', 'saida'),
  ('Fornecedores', 'saida')
ON CONFLICT DO NOTHING;

-- Dados iniciais: metodos de pagamento
INSERT INTO payment_method_config (name, default_rate) VALUES
  ('Pix', 0),
  ('Cartao de Credito', 3.5),
  ('Wise', 1.5),
  ('Especie', 0),
  ('Transferencia Bancaria', 0)
ON CONFLICT (name) DO NOTHING;

-- Dados iniciais: configuracoes do sistema
INSERT INTO system_settings (key, value, description) VALUES
  ('currency', 'BRL', 'Moeda padrao do sistema'),
  ('breakeven', '230000', 'Meta de break-even mensal'),
  ('lowBalanceAlert', '5000', 'Alerta de saldo baixo')
ON CONFLICT (key) DO NOTHING;
