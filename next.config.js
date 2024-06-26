/** @type {import('next').NextConfig} */
const nextConfig = {
	// output: 'export',
	reactStrictMode: false,
	swcMinify: true,
	webpack(config) {
		config.experiments = {
			asyncWebAssembly: true,
			layers: true,
		};

		return config;
	},
	images: {
		unoptimized: true,
	},
	experimental: {
		scrollRestoration: true,
	},
};

module.exports = nextConfig;
