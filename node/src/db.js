import postgres from "postgres";
import { Decimal } from "decimal.js";

export const sql = postgres({
	host: "localhost",
	database: "stream",
	password: "1234",
	user: "postgres",
	transform: postgres.camel,
	types: {
		bigint: postgres.BigInt,
		decimal: {
			// OID para o tipo 'numeric' no PostgreSQL
			to: 1700, // OID do tipo 'numeric'

			// OIDs para lidar com o parsing de valores vindos do banco de dados
			from: [1700],

			// Função para transformar o valor antes de enviá-lo ao banco
			serialize: (value) => value.toString(),

			// Função para transformar o valor vindo do banco
			parse: (value) => new Decimal(value),
		},
	},
});

export function monitorSession() {
	async function loadSessions() {
		const result = await sql`
			SELECT 
					usename AS username,    -- Nome do usuário
					client_addr AS ip,      -- Endereço IP do cliente
					COUNT(*) AS total_conns -- Total de conexões por IP/usuário
				FROM pg_stat_activity
				WHERE state = 'active'   -- Apenas conexões ativas
				GROUP BY usename, client_addr
				ORDER BY total_conns DESC;
		`;
		console.log("Conexões ativas no PostgreSQL:");
		console.table(result);
	}

	setInterval(loadSessions, 5_000);
}
