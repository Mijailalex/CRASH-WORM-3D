// ============================================================================
// 🎨 CRASH WORM 3D - PRETTIER CONFIGURATION
// ============================================================================
// Ubicación: prettier.config.js
// Configuración de Prettier para formateo consistente de código

/** @type {import("prettier").Config} */
export default {
  // ========================================
  // 📏 CONFIGURACIÓN BÁSICA
  // ========================================
  
  // Ancho máximo de línea
  printWidth: 100,
  
  // Tamaño de tabulación
  tabWidth: 2,
  
  // Usar espacios en lugar de tabs
  useTabs: false,
  
  // Punto y coma al final de statements
  semi: true,
  
  // Usar comillas simples en lugar de dobles
  singleQuote: true,
  
  // Comas finales donde sea sintácticamente válido
  trailingComma: 'es5',
  
  // Espacios dentro de llaves de objetos
  bracketSpacing: true,
  
  // Posición del > en elementos JSX multilinea
  bracketSameLine: false,
  
  // Paréntesis en arrow functions con un solo parámetro
  arrowParens: 'avoid',
  
  // Final de línea (LF para compatibilidad multiplataforma)
  endOfLine: 'lf',
  
  // Preservar espacios en blanco sensibles al contexto
  htmlWhitespaceSensitivity: 'css',
  
  // Formatear archivos embebidos
  embeddedLanguageFormatting: 'auto',

  // ========================================
  // 🔧 CONFIGURACIONES ESPECÍFICAS POR TIPO DE ARCHIVO
  // ========================================
  
  overrides: [
    // ========================================
    // ⚛️ ARCHIVOS REACT/JSX
    // ========================================
    {
      files: ['*.jsx', '*.tsx'],
      options: {
        // JSX usa comillas dobles por convención
        singleQuote: false,
        jsxSingleQuote: false,
        
        // Atributos JSX en nueva línea si es muy largo
        printWidth: 90,
        
        // Mantener elementos JSX consistentes
        bracketSameLine: false
      }
    },
    
    // ========================================
    // 📘 ARCHIVOS TYPESCRIPT
    // ========================================
    {
      files: ['*.ts', '*.tsx'],
      options: {
        // Parsear como TypeScript
        parser: 'typescript',
        
        // Semicolons requeridos en TS
        semi: true,
        
        // Configuraciones específicas para TS
        printWidth: 100,
        tabWidth: 2
      }
    },
    
    // ========================================
    // 🎨 ARCHIVOS CSS/SCSS
    // ========================================
    {
      files: ['*.css', '*.scss', '*.sass'],
      options: {
        // Parser CSS
        parser: 'css',
        
        // Líneas más cortas para CSS
        printWidth: 80,
        
        // Siempre usar semicolons en CSS
        semi: true,
        
        // Comillas simples en CSS
        singleQuote: true
      }
    },
    
    // ========================================
    // 📄 ARCHIVOS JSON
    // ========================================
    {
      files: ['*.json', '*.jsonc'],
      options: {
        // Parser JSON
        parser: 'json',
        
        // Sin comas finales en JSON
        trailingComma: 'none',
        
        // Usar comillas dobles en JSON (estándar)
        singleQuote: false,
        
        // Compactar JSON pero legible
        printWidth: 120,
        tabWidth: 2
      }
    },
    
    // ========================================
    // 📝 ARCHIVOS MARKDOWN
    // ========================================
    {
      files: ['*.md', '*.mdx'],
      options: {
        // Parser Markdown
        parser: 'markdown',
        
        // Líneas más largas en documentación
        printWidth: 120,
        
        // Preservar saltos de línea en prosa
        proseWrap: 'preserve',
        
        // Sin comas finales en código embebido
        trailingComma: 'none'
      }
    },
    
    // ========================================
    // 🌐 ARCHIVOS HTML
    // ========================================
    {
      files: ['*.html', '*.htm'],
      options: {
        // Parser HTML
        parser: 'html',
        
        // Líneas más largas para HTML
        printWidth: 120,
        
        // Preservar espacios en HTML
        htmlWhitespaceSensitivity: 'strict',
        
        // Comillas dobles en HTML (estándar)
        singleQuote: false
      }
    },
    
    // ========================================
    // ⚙️ ARCHIVOS DE CONFIGURACIÓN
    // ========================================
    {
      files: [
        '*.config.js',
        '*.config.ts',
        'vite.config.*',
        'vitest.config.*',
        'eslint.config.*',
        'prettier.config.*'
      ],
      options: {
        // Líneas más largas para configuraciones
        printWidth: 120,
        
        // Mantener comas finales en configs
        trailingComma: 'es5',
        
        // Formato más compacto
        bracketSpacing: true
      }
    },
    
    // ========================================
    // 🐳 ARCHIVOS DOCKER Y CI/CD
    // ========================================
    {
      files: [
        'Dockerfile*',
        'docker-compose*.yml',
        '.github/workflows/*.yml',
        '.gitlab-ci.yml',
        'azure-pipelines.yml'
      ],
      options: {
        // YAML formatting
        parser: 'yaml',
        
        // Líneas más largas para YAML
        printWidth: 100,
        
        // Mantener formato YAML estándar
        tabWidth: 2,
        useTabs: false,
        
        // Sin comas finales en YAML
        trailingComma: 'none'
      }
    },
    
    // ========================================
    // 🎮 ARCHIVOS ESPECÍFICOS DEL JUEGO
    // ========================================
    {
      files: [
        'src/core/**/*.js',
        'src/core/**/*.ts',
        'src/shaders/**/*.glsl',
        'src/shaders/**/*.vert',
        'src/shaders/**/*.frag'
      ],
      options: {
        // Líneas más largas para código del motor del juego
        printWidth: 120,
        
        // Formato más legible para matemáticas complejas
        bracketSpacing: true,
        arrowParens: 'always',
        
        // Mantener precisión en números de punto flotante
        tabWidth: 2
      }
    },
    
    // ========================================
    // 🧪 ARCHIVOS DE TEST
    // ========================================
    {
      files: [
        '**/*.test.js',
        '**/*.test.ts',
        '**/*.spec.js',
        '**/*.spec.ts',
        '**/__tests__/**/*.js',
        '**/__tests__/**/*.ts'
      ],
      options: {
        // Formato más compacto para tests
        printWidth: 100,
        
        // Comas finales para facilitar diffs
        trailingComma: 'es5',
        
        // Formato consistente con el resto del código
        singleQuote: true,
        semi: true
      }
    },
    
    // ========================================
    // 📦 PACKAGE.JSON Y MANIFESTS
    // ========================================
    {
      files: ['package.json', 'package-lock.json', 'manifest.json', 'tsconfig.json'],
      options: {
        // Parser JSON estricto
        parser: 'json',
        
        // Sin comas finales (JSON estándar)
        trailingComma: 'none',
        
        // Comillas dobles (JSON estándar)
        singleQuote: false,
        
        // Compacto pero legible
        printWidth: 100,
        tabWidth: 2
      }
    }
  ],

  // ========================================
  // 🔌 PLUGINS ADICIONALES
  // ========================================
  
  plugins: [
    // Plugin para ordenar imports
    '@trivago/prettier-plugin-sort-imports',
    
    // Plugin para Tailwind CSS classes
    'prettier-plugin-tailwindcss',
    
    // Plugin para organizar atributos HTML
    '@prettier/plugin-xml'
  ],

  // ========================================
  // 📋 CONFIGURACIÓN DE PLUGINS
  // ========================================
  
  // Configuración del plugin de sort-imports
  importOrder: [
    // React y librerías de UI
    '^react',
    '^@react-three',
    
    // Librerías externas
    '^three',
    '^cannon',
    '^tone',
    '^lodash',
    '^uuid',
    
    // Paths absolutos internos
    '^@/',
    '^@/core',
    '^@/components',
    '^@/hooks',
    '^@/utils',
    '^@/styles',
    '^@/data',
    
    // Imports relativos
    '^\\.\\./',
    '^\\.',
    
    // Archivos de estilo
    '\\.css$',
    '\\.scss$'
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  // ========================================
  // 🚫 ARCHIVOS A IGNORAR
  // ========================================
  
  // Nota: Los archivos a ignorar se definen en .prettierignore
  // Aquí algunos ejemplos de configuración programática:
  
  // Ignorar archivos generados
  ignoreGlobs: [
    'dist/**/*',
    'build/**/*',
    'coverage/**/*',
    'node_modules/**/*',
    '.vite/**/*',
    
    // Assets binarios
    '**/*.{png,jpg,jpeg,gif,webp,svg,ico}',
    '**/*.{mp3,wav,ogg,m4a}',
    '**/*.{glb,gltf,obj,fbx}',
    
    // Logs
    '**/*.log',
    'logs/**/*',
    
    // Temporales
    '**/*.tmp',
    '**/*.temp'
  ]
};

// ========================================
// 💡 CONFIGURACIÓN ADICIONAL PARA EQUIPOS
// ========================================

/*
ARCHIVO .prettierignore RECOMENDADO:

# Build outputs
dist/
build/
.vite/
coverage/

# Dependencies
node_modules/

# Generated files
public/sw.js
src/assets/generated/

# Binary assets
*.png
*.jpg
*.jpeg
*.gif
*.webp
*.svg
*.ico
*.mp3
*.wav
*.ogg
*.glb
*.gltf

# Logs
*.log
logs/

# Temporary files
*.tmp
*.temp

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/settings.json
.idea/

# Git files
.git/
*/

/*
SCRIPTS DE PACKAGE.JSON RECOMENDADOS:

{
  "scripts": {
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx,css,scss,md,json}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx,css,scss,md,json}\"",
    "format:staged": "pretty-quick --staged",
    "format:changed": "prettier --write $(git diff --name-only --diff-filter=ACMR | grep -E '\\.(js|jsx|ts|tsx|css|scss|md|json)$')"
  }
}
*/

/*
INTEGRACIÓN CON HUSKY (PRE-COMMIT):

# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged

# lint-staged configuration in package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{css,scss,md,json}": [
      "prettier --write"
    ]
  }
}
*/

/*
CONFIGURACIÓN DE EDITOR RECOMENDADA:

VS Code (.vscode/settings.json):
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "prettier.configPath": "./prettier.config.js"
}

WebStorm:
- File → Settings → Languages & Frameworks → JavaScript → Prettier
- Automatic Prettier configuration: ON
- Run for files: {**/*,*}.{js,ts,jsx,tsx,css,scss,md,json}
*/