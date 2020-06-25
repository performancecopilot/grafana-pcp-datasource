#
# build grafana-pcp
#
YARN = yarn
JSONNET_PATH = ../grafonnet-lib
DASHBOARD_DIR := src/dashboards
DASHBOARDS := $(addprefix $(DASHBOARD_DIR)/,pcp-vector-bcc-overview.json)

default: build

node_modules: package.json
	$(YARN) install
	sed -i 's/ || warningCount > 0//' node_modules/@grafana/toolkit/src/cli/tasks/plugin.build.js

$(DASHBOARD_DIR)/%.json: $(DASHBOARD_DIR)/%.jsonnet
	jsonnet -J $(JSONNET_PATH) -o $@ $<

dist: node_modules $(DASHBOARDS)
	$(YARN) run build

build: dist

watch: $(DASHBOARDS)
	$(YARN) run watch

test:
	$(YARN) run test

clean:
	rm -rf node_modules dist
