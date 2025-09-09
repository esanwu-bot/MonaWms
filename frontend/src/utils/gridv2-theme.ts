import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';
import { zhCN } from '@mui/material/locale';

// 为Grid v2组件添加默认配置
const themeWithGridV2: ThemeOptions = {
  components: {
    MuiGrid2: {
      defaultProps: {
        // 设置默认属性
      },
    },
  },
};

// 从现有主题导入并合并Grid v2配置
export const createThemeWithGridV2 = (baseTheme: ThemeOptions) => {
  return createTheme({
    ...baseTheme,
    components: {
      ...baseTheme.components,
      ...themeWithGridV2.components,
    },
  }, zhCN);
};