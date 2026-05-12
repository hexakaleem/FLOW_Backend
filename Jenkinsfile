pipeline {
    agent any

    environment {
        ENV_FILE = '/home/ubuntu/flow-backend/.env'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BUILD_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Prepare Compose') {
            steps {
                script {
                    env.DOCKER_COMPOSE_CMD = sh(script: '''
                        if command -v docker compose >/dev/null 2>&1; then
                            echo docker compose
                        elif docker compose version >/dev/null 2>&1; then
                            echo "docker compose"
                        else
                            echo ""
                        fi
                    ''', returnStdout: true).trim()

                    if (!env.DOCKER_COMPOSE_CMD) {
                        echo "Warning: docker compose not found on agent; deploy will fail unless installed."
                    } else {
                        echo "Using compose command: ${env.DOCKER_COMPOSE_CMD}"
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    echo "Building monolith..."
                    docker build \
                        --target monolith \
                        -t flow-monolith:${BUILD_TAG} \
                        -t flow-monolith:latest \
                        . || exit 1

                    echo "Building gateway..."
                    docker build \
                        --target gateway \
                        -t flow-gateway:${BUILD_TAG} \
                        -t flow-gateway:latest \
                        . || exit 1

                    echo "Building realtime..."
                    docker build \
                        --target realtime \
                        -t flow-realtime:${BUILD_TAG} \
                        -t flow-realtime:latest \
                        . || exit 1

                    echo "All images built successfully"
                '''
            }
        }

        stage('Deploy') {
            steps {
                script {
                    if (!env.DOCKER_COMPOSE_CMD) {
                        error("docker compose not found on agent; please install docker compose or docker compose plugin")
                    }

                    sh '''
                        if [ ! -f "${ENV_FILE}" ]; then
                            echo "ERROR: ${ENV_FILE} not found!"
                            echo "Create it: sudo mkdir -p /home/ubuntu/flow-backend && sudo nano /home/ubuntu/flow-backend/.env"
                            exit 1
                        fi
                    '''

                    sh "${env.DOCKER_COMPOSE_CMD} -f docker compose.yml -p flow-backend down --remove-orphans || true"
                    sh "${env.DOCKER_COMPOSE_CMD} --env-file ${ENV_FILE} -f docker compose.yml -p flow-backend up -d"
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    sleep(time: 20, unit: 'SECONDS')
                    def maxRetries = 12
                    def allHealthy = true

                    def retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/health || true', returnStdout: true).trim()
                        if (code == '200') { println "Gateway: HEALTHY"; break }
                        retry++; println "Gateway check ${retry}/${maxRetries}..."; sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Gateway FAILED"
                        if (env.DOCKER_COMPOSE_CMD) {
                            sh "${env.DOCKER_COMPOSE_CMD} -f docker compose.yml -p flow-backend logs gateway --tail 50 || true"
                        } else {
                            println "docker compose not available; cannot show gateway logs"
                        }
                        allHealthy = false
                    }

                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || true', returnStdout: true).trim()
                        if (code == '200') { println "Monolith: HEALTHY"; break }
                        retry++; println "Monolith check ${retry}/${maxRetries}..."; sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Monolith FAILED"
                        if (env.DOCKER_COMPOSE_CMD) {
                            sh "${env.DOCKER_COMPOSE_CMD} -f docker compose.yml -p flow-backend logs monolith --tail 50 || true"
                        } else {
                            println "docker compose not available; cannot show monolith logs"
                        }
                        allHealthy = false
                    }

                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3005/health || true', returnStdout: true).trim()
                        if (code == '200') { println "Realtime: HEALTHY"; break }
                        retry++; println "Realtime check ${retry}/${maxRetries}..."; sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Realtime FAILED"
                        if (env.DOCKER_COMPOSE_CMD) {
                            sh "${env.DOCKER_COMPOSE_CMD} -f docker compose.yml -p flow-backend logs realtime --tail 50 || true"
                        } else {
                            println "docker compose not available; cannot show realtime logs"
                        }
                        allHealthy = false
                    }

                    if (!allHealthy) error("One or more services failed health check")
                    println 'All services healthy!'
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker rmi flow-monolith:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-gateway:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-realtime:${BUILD_TAG} 2>/dev/null || true
                docker system prune -f 2>/dev/null || true
            '''
        }
        success {
            echo "SUCCESS! Build: ${BUILD_TAG}"
        }
        failure {
            echo "FAILED! Build: ${BUILD_TAG}"
        }
    }
}